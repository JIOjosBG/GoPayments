package scheduler

import (
	"backend/database"
	"backend/models"
	"context"
	"crypto/ecdsa"
	"errors"
	"fmt"
	"log"
	"time"

	"gorm.io/gorm"

	"math/big"
	"os"
	"strings"

	"github.com/ethereum/go-ethereum"
	"github.com/ethereum/go-ethereum/accounts/abi"
	"github.com/ethereum/go-ethereum/common"
	"github.com/ethereum/go-ethereum/core/types"
	"github.com/ethereum/go-ethereum/ethclient"

	hdwallet "github.com/miguelmota/go-ethereum-hdwallet"
)

const erc20ABI = `[{
	"name":"transferFrom",
	"type":"function",
	"stateMutability":"nonpayable",
	"inputs":[
		{"name":"from","type":"address"},
		{"name":"to","type":"address"},
		{"name":"value","type":"uint256"}
	],
	"outputs":[{"type":"bool"}]
}]`

type Job struct {
	RunAt      time.Time
	TemplateId uint
}

var parsedABI, _ = abi.JSON(strings.NewReader(erc20ABI))

var EXECUTOR_ADDRESS = "0x8b789Eb02B50c7c91Ff3eF2acF74d98d4DcC93fE"

// @TODO close the chan
var JobsChan = make(chan Job, 100)

type Transaction struct {
	To    common.Address
	Value *big.Int
	Data  []byte
}

func encodeExecute(
	calls []ethereum.CallMsg,
) ([]byte, error) {
	abiJSON := `[
	{
		"inputs": [
		{
			"components": [
			{ "internalType": "address", "name": "to", "type": "address" },
			{ "internalType": "uint256", "name": "value", "type": "uint256" },
			{ "internalType": "bytes", "name": "data", "type": "bytes" }
			],
			"internalType": "struct Transaction[]",
			"name": "calls",
			"type": "tuple[]"
		}
		],
		"name": "executeBySender",
		"outputs": [],
		"stateMutability": "payable",
		"type": "function"
	}
	]`
	parsedABI, err := abi.JSON(strings.NewReader(abiJSON))
	if err != nil {
		return nil, err
	}

	txs := make([]Transaction, len(calls))
	for i, c := range calls {
		zero := big.NewInt(0)
		txs[i] = Transaction{
			To:    *c.To,
			Value: zero,
			Data:  c.Data,
		}
	}

	return parsedABI.Pack("executeBySender", txs)
}

func walletFromSeed(seed string) (*ecdsa.PrivateKey, common.Address, error) {
	wallet, err := hdwallet.NewFromMnemonic(seed)
	if err != nil {
		return nil, common.Address{}, err
	}

	path := hdwallet.MustParseDerivationPath("m/44'/60'/0'/0/0")
	account, err := wallet.Derive(path, false)
	if err != nil {
		return nil, common.Address{}, err
	}

	privKey, err := wallet.PrivateKey(account)
	if err != nil {
		return nil, common.Address{}, err
	}

	return privKey, account.Address, nil
}

func encodeCalls(template models.PaymentTemplate) []ethereum.CallMsg {
	var calls []ethereum.CallMsg
	for transferId, t := range template.Transfers {
		from := common.HexToAddress(template.User.EthereumAddress)
		to := common.HexToAddress(t.DestinationUserAddress)
		contract := common.HexToAddress(t.Asset.ContractAddress)

		// amount * 10^decimals
		decimals := new(big.Int).Exp(big.NewInt(10), big.NewInt(int64(t.Asset.Decimals)), nil)
		amount := new(big.Float).
			Mul(big.NewFloat(t.Amount), new(big.Float).SetInt(decimals))

		value, _ := amount.Int(nil)

		data, err := parsedABI.Pack(
			"transferFrom",
			from,
			to,
			value,
		)
		if err != nil {
			log.Printf("error creating call: templateId=%d, transferIf=%d", template.ID, transferId)
			continue
		}

		// Ethereum call payload
		call := ethereum.CallMsg{
			To:   &contract,
			Data: data,
		}
		calls = append(calls, call)
	}
	return calls
}

func getClient(chainID int64) (*ethclient.Client, error) {
	var rpc string

	switch chainID {
	case 10:
		rpc = "https://invictus.ambire.com/optimism"
	case 8453:
		rpc = "https://invictus.ambire.com/base"
	default:
		return nil, fmt.Errorf("unsupported chain id: %d", chainID)
	}

	client, err := ethclient.Dial(rpc)
	if err != nil {
		return nil, err
	}

	return client, nil
}

func sendSelfCall(client *ethclient.Client, priv *ecdsa.PrivateKey, from common.Address, data []byte) error {
	ctx := context.Background()

	nonce, err := client.PendingNonceAt(ctx, from)
	if err != nil {
		return err
	}

	// Estimate gas
	msg := ethereum.CallMsg{
		From: from,
		To:   &from, // self-call
		Data: data,
	}
	gasLimit, err := client.EstimateGas(ctx, msg)
	if err != nil {
		return err
	}

	// Suggest gas price
	gasPrice, err := client.SuggestGasPrice(ctx)
	if err != nil {
		return err
	}

	chainID, err := client.ChainID(ctx)
	if err != nil {
		return err
	}

	tx := types.NewTransaction(nonce, from, big.NewInt(0), gasLimit, gasPrice, data)
	signedTx, err := types.SignTx(tx, types.LatestSignerForChainID(chainID), priv)
	if err != nil {
		return err
	}

	return client.SendTransaction(ctx, signedTx)
}

func executePayments(templateId uint) {

	var template models.PaymentTemplate
	err := database.DB.
		Preload("Transfers").
		Preload("User").
		Preload("Transfers.SourceUser").
		Preload("Transfers.Asset").
		First(&template, templateId).Error

	if template.IsCancelled {
		fmt.Printf("Payment %d was cancelled\n", templateId)
		return
	}

	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			log.Printf("payment template not found: templateId=%d", templateId)
		} else {
			log.Printf("db error reading templateId=%d: %v", templateId, err)
		}
		return
	}

	var calls []ethereum.CallMsg = encodeCalls(template)

	seedPhrase := os.Getenv("EXECUTOR_SEED")
	priv, addr, _ := walletFromSeed(seedPhrase)

	data, _ := encodeExecute(calls)

	client, err := getClient(int64(template.Transfers[0].Asset.ChainID))
	if err != nil {
		log.Fatal(err)
		return
	}
	sendSelfCall(client, priv, addr, data)
	fmt.Printf("calls sent %d\n", template.ID)

	if template.RecurringInterval != nil && *template.RecurringInterval > 0 {
		future := time.Now().Add(time.Duration(*template.RecurringInterval) * time.Second)
		fmt.Println(future.String())
		JobsChan <- Job{RunAt: future, TemplateId: templateId}
	}
}

func JobWatcher() {
	for job := range JobsChan {
		go func(j Job) {
			timer := time.NewTimer(time.Until(j.RunAt))
			defer timer.Stop()

			<-timer.C
			executePayments(j.TemplateId)
		}(job)
	}
}
