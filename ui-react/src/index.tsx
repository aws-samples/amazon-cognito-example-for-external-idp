import React from 'react';
import ReactDOM from 'react-dom';
import './index.css';
import App from './components/App';
import * as serviceWorker from './serviceWorker';
import {HttpAPIService} from "./service/APIService";
import Amplify, {API, Auth} from 'aws-amplify';
import amplifyConfig from './config/amplifyConfig';

Amplify.configure(amplifyConfig);

const apiService = new HttpAPIService(API, Auth);


ReactDOM.render(<App apiService={apiService} />, document.getElementById('root'));

// If you want your app to work offline and load faster, you can change
// unregister() to register() below. Note this comes with some pitfalls.
// Learn more about service workers: https://bit.ly/CRA-PWA
serviceWorker.unregister();
