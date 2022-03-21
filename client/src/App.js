import './App.css';
import Home from './routes/Home';
import Room from './routes/Room';
import { BrowserRouter as Router, Switch, Route } from "react-router-dom";

function App() {
  return (
    <div className="App">
        <Router>
          <Switch>
            <Route exact path="/">
              <Home />
            </Route>
            <Route path="/room/:roomID">
              <Room />
            </Route>
          </Switch>
        </Router>
    </div>
  );
}

export default App;
