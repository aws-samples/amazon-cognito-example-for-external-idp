// App.js
import React, {ChangeEvent, Component, FormEvent, Fragment} from 'react';
import './App.css';
import {Auth, Hub} from 'aws-amplify';
import {CognitoUser} from '@aws-amplify/auth';
import {Pet} from "../model/pet";
import {User} from "../model/user";
import {APIService} from "../service/APIService";

const numberFormat = new Intl.NumberFormat(undefined, {
  style: 'currency',
  currency: 'USD',
  minimumFractionDigits: 0,
  maximumFractionDigits: 0
});

interface AppProps {
  apiService: APIService
}

export interface State {
  authState?: 'signedIn' | 'signedOut' | 'loading';
  user?: User;
  pets?: Pet[];
  error?: any;
  message?: string;
  selectedPet?: Pet;
  loading?: boolean;
}

class App extends Component<AppProps, State> {

  private apiService: APIService;

  constructor(props: AppProps) {

    super(props);

    this.apiService = props.apiService;

    this.state = {
      authState: 'loading',
    }
  }

  async componentDidMount() {
    console.log("componentDidMount");
    Hub.listen('auth', async ({payload: {event, data}}) => {
      switch (event) {
        case 'cognitoHostedUI':
          let user = await this.getUser();
          // workaround for FF bug: https://bugzilla.mozilla.org/show_bug.cgi?id=1422334
          // eslint-disable-next-line
          // noinspection SillyAssignmentJS
          window.location.hash = window.location.hash;
          this.setState({authState: 'signedIn', user: user});
          break;
        case 'cognitoHostedUI_failure':
          this.setState({authState: 'signedOut', user: null, error: data});
          break;
        default:
          break;
      }
    });

    // if the URL contains ?identity_provider=x, and the user is signed out, we redirect to the IdP on load
    const urlParams = new URLSearchParams(window.location.search);
    const idpParamName = 'identity_provider';
    const idp = urlParams.get(idpParamName);

    try {
      let user = await this.getUser();

      // remove identity_provider query param (not needed if signed in successfully)
      if (idp) {
        urlParams.delete(idpParamName);
        const params = urlParams.toString();
        window.history.replaceState(null, null, window.location.pathname + (params ? '?' + params : ''));
      }

      this.setState({authState: 'signedIn', user: user});
    } catch (e) {
      // user is not authenticated, and we have an IdP in the request
      if (e === 'not authenticated' && idp) {
        await Auth.federatedSignIn({customProvider: idp});
      } else {
        console.warn(e);
        this.setState({authState: 'signedOut', user: null});
      }
    }
  }

  private async getUser() {
    let cognitoUser: CognitoUser = await Auth.currentAuthenticatedUser();
    return new User(cognitoUser);
  }

  async componentDidUpdate(prevProps: Readonly<any>, prevState: Readonly<State>) {
    if (prevState.authState !== this.state.authState && this.state.authState === "signedIn") {
      await this.getAllPets();
    }
  }

  render() {

    const {authState, pets, user, error, selectedPet, message, loading}: Readonly<State> = this.state;

    let username: string;
    let groups: string[] = [];
    if(user) {
      // using first name for display
      username = user.name || user.email;
      groups = user.groups;
    }
    return (
      <Fragment>
        <nav className="navbar navbar-expand-md navbar-dark bg-dark">

          <a className="navbar-brand" href="/">Amazon Cognito + AWS Amplify + React Demo</a>

          <button className="navbar-toggler" type="button" data-toggle="collapse" data-target="#navbarsExampleDefault"
                  aria-controls="navbarsExampleDefault" aria-expanded="false" aria-label="Toggle navigation">
            <span className="navbar-toggler-icon"/>
          </button>


          <div className="collapse navbar-collapse" id="navbarsExampleDefault">
            <ul className="navbar-nav mr-auto">
              <li className="nav-item active">
                <a className="nav-link" href="/">Home <span className="sr-only">(current)</span></a>
              </li>

            </ul>
            {[...groups].map(group =>
              <span className={`badge badge-${group.endsWith("admins") ? "success" : "info"} mr-2`}
                    key={group}>{group}</span>)}
            <div className="my-2 my-lg-0 navbar-nav">


              {authState === 'loading' && (<div>loading...</div>)}
              {authState === 'signedOut' &&
              <Fragment>
              <button className="btn btn-primary m-1" onClick={() => Auth.federatedSignIn({customProvider: "IdP"})}>Single Sign On</button>
              <button className="btn btn-primary m-1" onClick={() => Auth.federatedSignIn()}>Sign In / Sign Up</button>
              </Fragment>
              }
              {authState === 'signedIn' &&

              <div className="nav-item dropdown">
                <button className="nav-link dropdown-toggle btn btn-link" data-toggle="dropdown">{username}</button>
                <div className="dropdown-menu dropdown-menu-right">
                  <button className="dropdown-item btn btn-warning" onClick={() => this.signOut()}>Sign Out</button>
                </div>
              </div>
              }

            </div>
          </div>
        </nav>

        <div className="container-fluid">

          {error &&
          <div className="alert alert-warning" onClick={() => this.setState({error: null})}>{error.toString()}</div>}

          {message &&
          <div className="alert alert-info" onClick={() => this.setState({message: null})}>{message.toString()}</div>}

          {authState === 'signedOut' && <div className="alert alert-info">Please sign in</div>}

          {authState === 'signedIn' && <div className="container">
            {pets &&
            <table className="table">
              <thead>
              <tr>
                <th>owner</th>
                <th>type</th>
                <th>price</th>
              </tr>

              </thead>
              <tbody>
              {pets.map(pet =>
                <tr id={"row" + pet.id} key={pet.id}
                    onClick={() => this.setState({selectedPet: pet})}
                    className={selectedPet && pet.id === selectedPet.id ? "table-active" : ""}
                >
                  <td><span className='badge badge-secondary'>{pet.ownerDisplayName}</span></td>
                  <td><strong>{pet.type}</strong></td>
                  <td>{numberFormat.format(pet.price || 0)}</td>
                </tr>)
              }
              </tbody>
            </table>}


            {selectedPet && selectedPet.id &&
            <button className="btn btn-danger m-1" onClick={() => this.deletePet()}>Delete</button>}

            {<button className="btn btn-primary m-1" onClick={() => this.newOnClick()}>Create New</button>}

            {<button className="btn btn-success m-1" onClick={() => this.getAllPets()}>Reload</button>}


            {selectedPet &&
            <div className="card">
              <div className="card-body">
                <form className="form-inline" onSubmit={e => this.savePet(e)}>
                  <input className="form-control" type="hidden" value={selectedPet.id || ""} placeholder="Id"
                         onChange={e => this.handleChange(e, (state, value) => state.selectedPet.id = value)}/>
                  <input className="form-control" type="text" value={selectedPet.type || ""} placeholder="Type"
                         onChange={e => this.handleChange(e, (state, value) => state.selectedPet.type = value)}/>
                  <input className="form-control" type="text" value={selectedPet.price || ""} placeholder="Price"
                         onChange={e => this.handleChange(e, (state, value) => state.selectedPet.price = this.getAsNumber(value))}/>
                  <button type="submit" className="btn btn-success m-1">{selectedPet.id ? "Update" : "Save"}</button>

                </form>

              </div>
            </div>}


            {loading && <div className="d-flex justify-content-center">
              <div className="spinner-border" role="status">
                <span className="sr-only">Loading...</span>
              </div>
            </div>}


          </div>}

        </div>


      </Fragment>
    );
  }

  handleChange(event: ChangeEvent<HTMLInputElement>, mapper: (state: State, value: any) => void) {
    const value = event.target.value;
    this.setState(state => {
      mapper(state, value);
      return state;
    });
  }

  newOnClick() {
    // we explicitly set to null, undefined causes react to assume there was no change
    this.setState({selectedPet: new Pet()});

  }

  async getAllPets() {
    try {
      this.setState({loading: true, selectedPet: undefined});
      let pets: Pet[] = await this.apiService.getAllPets();
      this.setState({pets, loading: false});
    } catch (e) {
      console.log(e);
      this.setState({error: `Failed to load pets: ${e}`, pets: [], loading: false});
    }
  }

  async savePet(event: FormEvent<HTMLFormElement>) {

    event.preventDefault();


    const pet = this.state.selectedPet;

    if (!pet) {
      this.setState({error: "Pet is needed"});
      return;
    }
    try {
      this.setState({loading: true});
      await this.apiService.savePet(pet);

      await this.getAllPets();
    } catch (e) {
      this.setState({error: "Failed to save pet. " + e.message, loading: false});
    }
  }

  async deletePet() {

    if (!window.confirm("Are you sure?")) {
      return;
    }
    const pet = this.state.selectedPet;

    if (!pet) {
      this.setState({error: "Pet is needed"});
      return;
    }
    try {
      this.setState({loading: true});
      await this.apiService.deletePet(pet);
      return this.getAllPets();
    } catch (e) {
      this.setState({error: "Failed to save pet. " + e.message, loading: false});
    }
  }

  async signOut() {
    try {
      this.setState({authState: 'signedOut', pets: null, user: null});
      await this.apiService.forceSignOut();
    } catch (e) {
      console.log(e);
    }
  }

  private getAsNumber(value: any): number | undefined {
    if (value) {
      try {
        return parseInt(value)
      } catch (ignored) {
      }
    }
    return undefined;
  }
}

export default App;
