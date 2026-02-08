import { Navbar, Nav, Container } from "react-bootstrap";
import { Link, NavLink } from "react-router-dom";

const Header = () => {
  return (
    <Navbar bg="dark" variant="dark" expand="lg" sticky="top">
      <Container>
        <Navbar.Brand as={Link} to="/">
          🚀 GoPayments
        </Navbar.Brand>

        <Navbar.Toggle aria-controls="main-navbar" />
        <Navbar.Collapse id="main-navbar">
          <Nav className="ms-auto">
            <Nav.Link as={NavLink} to="/">
              Home
            </Nav.Link>
            <Nav.Link as={NavLink} to="/assets">
              Assets
            </Nav.Link>
            <Nav.Link as={NavLink} to="/history">
              History
            </Nav.Link>
            <Nav.Link as={NavLink} to="/create">
              Create
            </Nav.Link>
            <Nav.Link as={NavLink} to="/login">
              Login
            </Nav.Link>
          </Nav>
        </Navbar.Collapse>
      </Container>
    </Navbar>
  );
};

export default Header;
