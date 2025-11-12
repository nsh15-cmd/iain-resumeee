import {Link} from "react-router";

const Navbar = () => {
    return (
        <nav className="navbar ">
            <Link to="/">
<<<<<<< HEAD
                <p className="text-2xl font-bold text-gradient ">IAIN - Resume Assitant</p>
=======
                <p className="text-2xl font-bold text-gradient">IAIN - Resume Analyzer</p>
>>>>>>> 433c5d9be65a251e8adf712c37b65bf297570fb9
            </Link>
            <Link to="/upload" className="primary-button w-fit">
                Upload Resume
            </Link>
        </nav>
    )
}
export default Navbar
