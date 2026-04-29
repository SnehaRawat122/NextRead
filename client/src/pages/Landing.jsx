import { useNavigate } from "react-router-dom";

function Landing() {
  const navigate = useNavigate();

  const styles = {
    container: {
      height: "100vh",
      width: "100%",
      backgroundImage:
        "url('https://i.pinimg.com/1200x/41/da/49/41da493dcd1ab5bc2e18fb2e682860a0.jpg')",
      backgroundSize: "cover",
      backgroundPosition: "center",
      display: "flex",
      justifyContent: "center",
      alignItems: "center",
    },

    card: {
    background: "rgba(255, 255, 255, 0.99)",
      backdropFilter: "blur(18px)",
      WebkitBackdropFilter: "blur(18px)",
      borderRadius: "20px",
      padding: "50px 70px",
      width: "420px",
      textAlign: "center",
      boxShadow: "0 8px 40px rgba(0,0,0,0.25)",
      border: "1px solid rgba(255,255,255,0.3)",
    },

    title: {
      fontSize: "2.5rem",
      fontWeight: "bold",
     fontFamily: "'Pacifico', cursive",
      color: "#333",
    },

    subtitle: {
      margin: "15px 0 25px",
      color: "#555",
    },

    button: {
      margin: "8px",
      padding: "12px 20px",
      fontSize: "1rem",
      border: "none",
      borderRadius: "8px",
      cursor: "pointer",
      width: "120px",
    },

    loginBtn: {
      backgroundColor: "#4cafef",
      color: "white",
    },

    registerBtn: {
      backgroundColor: "#eee",
      color: "#333",
    },
  };

  return (
    <div style={styles.container}>
      <div style={styles.card}>
        <h1 style={styles.title}>NextRead</h1>
        <p style={styles.subtitle}>
          Discover your next favorite book..
        </p>

        <div>
          <button
            style={{ ...styles.button, ...styles.loginBtn }}
            onClick={() => navigate("/login")}
          >
            Login
          </button>

          <button
            style={{ ...styles.button, ...styles.registerBtn }}
            onClick={() => navigate("/register")}
          >
            Register
          </button>
        </div>
      </div>
    </div>
  );
}

export default Landing;