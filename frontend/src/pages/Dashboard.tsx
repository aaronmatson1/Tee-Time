import { Link } from "react-router-dom";

export default function Dashboard() {
  return (
    <div>
      <h1>Dashboard</h1>
      <p className="muted">Quick start:</p>
      <div className="row">
        <Link to="/groups"><button>Manage groups</button></Link>
        <Link to="/windows"><button className="ghost">Set windows</button></Link>
        <Link to="/matches"><button className="ghost">View matches</button></Link>
      </div>
    </div>
  );
}
