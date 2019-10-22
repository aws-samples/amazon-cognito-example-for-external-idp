import {Component, NgZone, OnInit} from '@angular/core';
import {AmplifyService} from 'aws-amplify-angular';
import Amplify, {API, Auth} from 'aws-amplify';
import Axios from 'axios';
import {User} from '../../../ui-react/src/model/user';
import amplifyConfig from '../../../ui-react/src/config/amplifyConfig';
import {Pet} from '../../../ui-react/src/model/pet';
import {HttpAPIService} from '../../../ui-react/src/service/APIService';

// create-react-app doesn't allow importing outside of the src folder (without some workarounds),
// but Angular doesn't have this restriction, so for staying DRY
// we put any shared classes in the react project and import it from Angular
// this is just to keep things simple and avoiding ejecting the create-react-app
// in the real world a separate package with the shared items should be considered

// set Amplify configuration
Amplify.configure(amplifyConfig);

interface Model {
  user?: User;
  errorMessage?: string;
  infoMessage?: string;
  pets: Pet[];
  selectedPet?: Pet;
  loading: boolean;
}

/**
 * Our main component
 */
@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss'],
  providers: [{provide: HttpAPIService, useFactory: () => new HttpAPIService(API, Auth)}],
})
export class AppComponent implements OnInit {

  // ========================================================================
  // Public Members
  // ========================================================================

  model: Model = {
    user: null,
    errorMessage: null,
    infoMessage: null,
    pets: [],
    selectedPet: null,
    loading: false
  };

  constructor(private amplifyService: AmplifyService,
              private apiService: HttpAPIService,
              private zone: NgZone) {
  }

  // ========================================================================
  // Public methods
  // ========================================================================

  // ------------------------------------------------------------------------
  // Auth operations
  // ------------------------------------------------------------------------

  async ngOnInit(): Promise<void> {
    try {
      this.subscribeToAuthChanges();
      this.registerLoadingIndicator();
      await this.onLoad();
    } catch (e) {
      console.warn(e);
    }
  }

  async signIn(idpName?: string) {
    await Auth.federatedSignIn(idpName ? {customProvider: idpName} : undefined);
  }

  async signOut() {
    try {
      this.model.pets = null;
      this.model.user = null;
      await this.apiService.forceSignOut();

    } catch (e) {
      this.model.errorMessage = 'Failed to sign out. ' + e.message;
    }
  }


  // ------------------------------------------------------------------------
  // CRUD operations
  // ------------------------------------------------------------------------

  async getAllPets() {
    try {
      return await this.apiService.getAllPets();
    } catch (e) {
      console.warn(e);
      this.model.errorMessage = 'Failed to get pets. ' + e.message;
      return [];
    }
  }

  async savePet() {

    const pet = this.model.selectedPet;

    if (!pet) {
      this.model.errorMessage = 'Pet is needed';
      return;
    }
    try {
      await this.apiService.savePet(pet);
      await this.loadAllPets();
    } catch (e) {
      this.model.errorMessage = 'Failed to save pet. ' + e.message;
    }
  }

  async deletePet() {

    if (!window.confirm('Are you sure?')) {
      return;
    }
    const pet = this.model.selectedPet;

    if (!pet) {
      this.model.errorMessage = 'Pet is needed';
      return;
    }
    try {
      await this.apiService.deletePet(pet);
      await this.loadAllPets();
    } catch (e) {
      this.model.errorMessage = 'Failed to delete pet. ' + e.message;
    }
  }

  // ------------------------------------------------------------------------
  // Model operations
  // ------------------------------------------------------------------------

  newPet() {
    this.model.selectedPet = new Pet();
  }

  setSelectedPet(pet: Pet) {
    this.model.selectedPet = pet;
  }

  async loadAllPets() {
    this.model.pets = await this.getAllPets();
    this.model.selectedPet = null;
  }


  // ========================================================================
  // Private methods
  // ========================================================================

  private async onLoad() {
    this.model.user = await this.getUser();
    await this.loadAllPets();
  }

  private async getUser() {
    return new User(await Auth.currentAuthenticatedUser());
  }

  private subscribeToAuthChanges() {

    const successHandler = this.getAuthSuccessHandler();
    const errorHandler = this.getAuthErrorHandler();

    this.amplifyService.authStateChange$.subscribe(successHandler, errorHandler);
  }

  private getAuthSuccessHandler(): (authState) => Promise<void> {

    return async (authState) => {

      // ensuring the code runs in the right angular zone
      // - https://github.com/angular/angular/issues/10208#issuecomment-234749786
      // - https://github.com/angular/zone.js/issues/830

      await this.zone.run(async () => {
        // noinspection JSRedundantSwitchStatement
        switch (authState.state) {
          case 'cognitoHostedUI':
            await this.onLoad();
            // workaround for FF bug: https://bugzilla.mozilla.org/show_bug.cgi?id=1422334
            // noinspection SillyAssignmentJS
            window.location.hash = window.location.hash;
            break;
          default:
            break;
        }
      });
    };

  }

  private getAuthErrorHandler() {

    return (error) => {
      // ensuring the code runs in the right angular zone
      // - https://github.com/angular/angular/issues/10208#issuecomment-234749786
      // - https://github.com/angular/zone.js/issues/830

      this.zone.run( () => {
        this.model.user = null;
        console.warn(error);
      });
    };
  }

  private registerLoadingIndicator() {
    // show a loading indicator automatically
    Axios.interceptors.request.use(config => {
      this.model.loading = true;
      return config;
    }, error => {
      this.model.loading = false;
      return Promise.reject(error);
    });

    Axios.interceptors.response.use(response => {
      this.model.loading = false;
      return response;
    }, error => {
      this.model.loading = false;
      return Promise.reject(error);
    });
  }
}
