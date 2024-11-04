import React from 'react';
import ReactDOM from 'react-dom';
import './index.css';
import App from './components/App';
import * as serviceWorker from './serviceWorker';
import {HttpAPIService} from "./service/APIService";
import {Amplify} from 'aws-amplify';
import amplifyConfig from './config/amplifyConfig';

Amplify.configure({
    Auth: amplifyConfig.Auth,
    API: amplifyConfig.API
  });

const apiService = new HttpAPIService();


ReactDOM.render(<App apiService={apiService} />, document.getElementById('root'));

// If you want your app to work offline and load faster, you can change
// unregister() to register() below. Note this comes with some pitfalls.
// Learn more about service workers: https://bit.ly/CRA-PWA
serviceWorker.unregister();
