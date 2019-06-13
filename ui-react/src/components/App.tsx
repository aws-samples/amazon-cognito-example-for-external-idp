// App.js
import React, {ChangeEvent, Component, FormEvent} from 'react';
import './App.css';
import Amplify, {Auth, Hub} from 'aws-amplify';
import {CognitoUser} from '@aws-amplify/auth';
import {AUTH_OPTS} from "../config";
import {Pet} from "../model/pet";
import {getClaims, getGroups} from "../amazonCognitoHelpers";
import {PetService} from "../service/petService";

Amplify.configure({Auth: AUTH_OPTS});

const numberFormat = new Intl.NumberFormat(undefined, {
  style: 'currency',
  currency: 'USD',
  minimumFractionDigits: 0,
  maximumFractionDigits: 0
});

interface AppProps {
  petService: PetService
}

interface State {
  authState?: 'signedIn' | 'signIn' | 'loading';
  user?: CognitoUser;
  pets?: Pet[];
  error?: any;
  message?: string;
  selectedPet?: Pet;
}

class App extends Component<AppProps, State> {

  private petService: PetService;

  constructor(props: AppProps) {

    super(props);

    this.petService = props.petService;

    this.state = {
      authState: 'loading',
    }
  }

  async componentDidMount() {

    Hub.listen('auth', ({payload: {event, data}}) => {
      switch (event) {
        case 'signIn':
          this.setState({authState: 'signedIn', user: data, error: null});
          break;
        case 'signIn_failure':
          this.setState({authState: 'signIn', user: null, error: data});
          break;
        default:
          break;
      }
    });

    try {
      let user: CognitoUser = await Auth.currentAuthenticatedUser();
      console.log('on component mount');
      this.setState({authState: 'signedIn', user: user});
    } catch (e) {
      console.log(e);
      this.setState({authState: 'signIn', user: null});
    }
  }

  async componentDidUpdate(prevProps: Readonly<any>, prevState: Readonly<State>) {
    console.log(prevState, this.state);
    if (prevState.authState !== this.state.authState) {

      if (this.state.authState === "signedIn") {
        await this.getAllPets();
      }
    }
  }

  render() {

    const {authState, pets, user, error, selectedPet, message}: Readonly<State> = this.state;

    const claims = getClaims(user);
    console.log("Claims: ", claims);
    let username;
    if(claims && claims.email) {
      username = claims.email;
    } else if (user) {
      username = user.getUsername();
    }

    const groups: string[] = getGroups(claims);

    return (
      <React.Fragment>
        <nav className="navbar navbar-expand-md navbar-dark bg-dark">

          <a className="navbar-brand" href="/">Cognito + Amplify + React Demo</a>

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
            <div className="my-2 my-lg-0">

              {authState === 'loading' && (<div>loading...</div>)}
              {authState === 'signIn' &&
              <button className="btn btn-primary" onClick={() => Auth.federatedSignIn()}>Sign In / Sign Up</button>}
              {authState === 'signedIn' && <div>
                <span className="badge badge-info">{username}</span> &nbsp;
                {[...groups].map(group => <span key={group} className="badge badge-success mr-2">{group}</span>)}
                <button className="btn btn-warning" onClick={() => this.signOut()}>Sign out</button>

              </div>}

            </div>
          </div>
        </nav>

        <div className="container-fluid">

          {/* Error Messages */}

          {error &&
          <div className="alert alert-warning" onClick={() => this.setState({error: null})}>{error.toString()}</div>}

          {message &&
          <div className="alert alert-info" onClick={() => this.setState({message: null})}>{message.toString()}</div>}

          {authState === 'signIn' && <div className="alert alert-info">Please sign in</div>}

          {authState === 'signedIn' && <div className="container">
            {pets &&
            <table className="table">
              <thead>
              <tr>
                <th>id</th>
                <th>type</th>
                <th>price</th>
              </tr>

              </thead>
              <tbody>
              {pets.map(pet =>
                <tr id={"row" + pet.id} key={pet.id} onClick={() => this.setState({selectedPet: pet})}>
                  <td><span className='badge badge-secondary'>{pet.id}</span></td>
                  <td><strong>{pet.type}</strong></td>
                  <td>{numberFormat.format(pet.price || 0)}</td>
                </tr>)
              }
              </tbody>
            </table>}

            {selectedPet &&
            <form onSubmit={e => this.savePet(e)}>
              <input className="form-control" type="hidden" value={selectedPet.id || ""} placeholder="Id"
                     onChange={e => this.handleChange(e, (state, value) => state.selectedPet.id = value)}/>
              <input className="form-control" type="text" value={selectedPet.type || ""} placeholder="Type"
                     onChange={e => this.handleChange(e, (state, value) => state.selectedPet.type = value)}/>
              <input className="form-control" type="text" value={selectedPet.price || ""} placeholder="Price"
                     onChange={e => this.handleChange(e, (state, value) => state.selectedPet.price = this.getAsNumber(value))}/>
              <input type="submit" className="btn btn-success" value={selectedPet.id ? "Update" : "Save"}/>
            </form>}

            {<button className="btn btn-primary" onClick={() => this.newOnClick()}>Create New</button>}

            {!pets && !error && <div className="alert alert-info">loading...</div>}

          </div>}

        </div>


      </React.Fragment>
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
      let pets: Pet[] = await this.petService.getAllPets();
      this.setState({pets});
    } catch (e) {
      this.setState({error: "Failed to load pets"});
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
      await this.petService.savePet(pet);
      return this.getAllPets();
    } catch (e) {
      this.setState({error: "Failed to save pet. " + e.message});
    }
  }

  async signOut() {
    try {
      await Auth.signOut();
      this.setState({authState: 'signIn', pets: null, user: null});
    } catch (e) {
      console.log(e);
    }
  }

  private getAsNumber(value: any) : number | undefined {
    if(value) {
      try {
        return parseInt(value)
      } catch (ignored) {}
    }
    return undefined;
  }
}

export default App;
