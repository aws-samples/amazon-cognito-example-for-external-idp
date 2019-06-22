import React from 'react';
import ReactDOM from 'react-dom';
import App from './App';
import {PetService} from "../service/petService";
import {Pet} from "../model/pet";
import {AuthService} from "../service/authService";

it('renders without crashing', () => {
  const div = document.createElement('div');

  const abstractPetService = (new class implements PetService{
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

  const abstractAuthService = (new class implements AuthService{
    forceSignOut(): Promise<void> {
      return undefined;
    }
  });
  ReactDOM.render(<App petService={abstractPetService} authService={abstractAuthService} />, div);
  ReactDOM.unmountComponentAtNode(div);
});
