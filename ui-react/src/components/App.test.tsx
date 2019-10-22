import React from 'react';
import ReactDOM from 'react-dom';
import App from './App';
import {APIService} from "../service/APIService";
import {Pet} from "../model/pet";

it('renders without crashing', () => {
  const div = document.createElement('div');

  const abstractPetService = (new class implements APIService{
    forceSignOut(): Promise<void> {
      return undefined;
    }
    deletePet(pet: Pet): Promise<void> {
      return undefined;
    }
    getAllPets(): Promise<Pet[]> {
      //TODO: implement
      return undefined;
    }

    savePet(pet: Pet): Promise<void> {
      //TODO: implement
      return undefined;
    }
  });

  ReactDOM.render(<App apiService={abstractPetService} />, div);
  ReactDOM.unmountComponentAtNode(div);
});
