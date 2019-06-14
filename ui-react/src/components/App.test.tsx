import React from 'react';
import ReactDOM from 'react-dom';
import App from './App';
import {PetService} from "../service/petService";
import {Pet} from "../model/pet";

it('renders without crashing', () => {
  const div = document.createElement('div');

  let abstractPetService = (new class implements PetService{
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
  ReactDOM.render(<App petService={abstractPetService} />, div);
  ReactDOM.unmountComponentAtNode(div);
});
