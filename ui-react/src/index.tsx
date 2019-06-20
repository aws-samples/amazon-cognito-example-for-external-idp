import React from 'react';
import ReactDOM from 'react-dom';
import './index.css';
import App from './components/App';
import * as serviceWorker from './serviceWorker';
import {HttpPetService} from "./service/petService";
import {HttpAuthService} from "./service/authService";

const petService = new HttpPetService();
const authService = new HttpAuthService();

ReactDOM.render(<App petService={petService} authService={authService}/>, document.getElementById('root'));

// If you want your app to work offline and load faster, you can change
// unregister() to register() below. Note this comes with some pitfalls.
// Learn more about service workers: https://bit.ly/CRA-PWA
serviceWorker.unregister();
