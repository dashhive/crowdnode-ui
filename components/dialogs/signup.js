import {
  DashSocket,
  DashSight,
  DashApi,
  CrowdNode,
} from '../../imports.js'
import { toDuff, addrToPubKeyHash } from '../../utils.js'
import { getPrivateKey } from '../../lib/storage.js'
import {
  hasOrRequestFunds,
} from '../../lib/ui.js'

// @ts-ignore
let dashsight = DashSight.create({
  baseUrl: 'https://dashsight.dashincubator.dev',
});
let dashApi = DashApi.create({ insightApi: dashsight });

const { hotwallet } = CrowdNode.main;
const { signupForApi, acceptTerms, offset } = CrowdNode.requests;
let feeEstimate = 500;
let signupOnly = signupForApi + offset;
let acceptOnly = acceptTerms + offset;
let signupFees = signupOnly + acceptOnly;
let signupTotal = signupFees + (2 * feeEstimate);

const initialState = {
  id: 'Modal',
  name: 'signup',
  submitTxt: 'Signup',
  submitAlt: 'Signup for CrowdNode',
  cancelTxt: 'Cancel',
  cancelAlt: 'Cancel CrowdNode Signup',
}

export class SignupDialog extends HTMLElement {
  static get observedAttributes() {
    return [
      'name',
      'address',
      'btn'
    ];
  }

  constructor() {
    super();

    this.name = this.getAttribute('name') || 'signup'
    this.btn = this.getAttribute('btn') || 'Signup for CrowdNode'
    this.address = this.getAttribute('address') || ''
    this.state = {
      ...initialState,
      name: this.name,
      submitTxt: this.btn,
    }

    // console.warn('SignupDialog custom el',
    //   this.addr, this.funds, this.needed, this.msg
    // )

    const dialog = document.createElement('dialog')
    const form = document.createElement('form')
    const style = document.createElement('style')
    const progress = document.createElement('progress')

    progress.classList.add('pending')

    style.textContent = `
      @import url(/index.css);
    `

    this.dialog = dialog
    this.form = form
    // this.style = style // this makes things go boom. DO NOT USE
    this.progress = progress

    this.render = this.render.bind(this);
    this.loadContent = this.loadContent.bind(this);
    this.showModal = this.showModal.bind(this);
    this.close = this.close.bind(this.dialog);
    this.listeners = {}

    dialog.innerHTML = `
      <figure>
        <form method="dialog">
          <button value="cancel" alt="${this.state.cancelAlt}">
            <span>${this.state.cancelTxt}</span>
          </button>
        </form>
      </figure>
    `

    this.loadContent()

    dialog.id = this.getAttribute('id') || `${this.name}Modal`
    dialog.classList.add('responsive')

    // this.handleChange = () => {}
    // this.handleSubmit = () => {}
    this.handleClose = event => {
      // @ts-ignore
      // event?.target?.remove()
      // @ts-ignore
      shadowRoot.host?.remove()

      if (this.listeners['close']?.length > 0) {
        for (let callback of this.listeners['close']) {
          callback(this.dialog)
        }
      }
    }
    this.handleSetPass = ({ detail }) => {
      console.log('signup dialog handleSetPass', detail)
      this._pass = detail;

      // if (this.listeners['set:pass']?.length > 0) {
      //   for (let callback of this.listeners['set:pass']) {
      //     callback(this.dialog)
      //   }
      // }
    }

    window.removeEventListener('set:pass', this.handleSetPass)
    window.addEventListener('set:pass', this.handleSetPass, { once: true })
    dialog.addEventListener('close', this.handleClose)

    const shadowRoot = this.attachShadow({mode: 'closed'});
    shadowRoot.appendChild(style);
    shadowRoot.appendChild(dialog);
  }

  set pass(value) {
    this._pass = value;
  }
  get pass() {
    return this._pass;
  }

  on(event, callback) {
    this.listeners[event] = this.listeners[event] || []
    this.listeners[event].push(callback)
  }

  close(e) {
    // console.log('SignupDialog close', this,
    //   this.addr, this.funds, this.needed, this.msg
    // )
    this.removeEventListener('close', this.handleClose)
    this.close(e)
  }

  showModal(e) {
    this.dialog?.showModal()
  }

  render() {
    this.form.innerHTML = `
      <fieldset>
        <label>
          <input name="acceptToS" type="checkbox" />
          I accept the CrowdNode <a href="https://crowdnode.io/terms/" target="_blank">Terms and Conditions</a>
        </label>
        <button name="signup" type="submit" disabled>${this.btn}</button>
      </fieldset>
    `
  }

  loadContent() {
    // console.log('SignupDialog loadContent', this,
    //   this.addr, this.funds, this.needed, this.msg
    // )

    this.form.setAttribute('name', `${this.name}Form`)

    this.render()

    this.handleChange = async event => {
      console.log(
        'signup handleChange',
        {
          event,
          eventTarget: event.target,
          acceptToS: this.form.acceptToS.checked,
          address: this.address
        }
      )

      this.form.signup.disabled = !this.form.acceptToS.checked
    }

    this.handleSubmit = async event => {
      event.preventDefault()

      const acceptToS = event.target.acceptToS?.checked

      console.log(
        'signup for crowdnode',
        {
          acceptToS,
          address: this.address
        }
      )

      if (this.address) {
        // FIX: add encryption passphrase
        let fromWif = await getPrivateKey(this.address, this._pass) // , pass

        this.form.querySelector('fieldset').disabled = true
        this.dialog.querySelector('figure')
          .insertAdjacentElement('afterbegin', this.progress)

        document.body.insertAdjacentHTML(
          'afterbegin',
          `<progress id="pageLoader" class="pending"></progress>`,
        )

        // wait for signup
        // wait for accept TOS

        console.log('privKey', this.address, this._pass, fromWif)

        await hasOrRequestFunds(
          this.address,
          signupTotal,
          'to signup for CrowdNode'
        )

        let cnStatus = await CrowdNode.status(this.address, hotwallet);
        let cnSignup
        let cnAccept

        if (
          !cnStatus ||
          cnStatus?.signup === 0
        ) {
          cnSignup = await CrowdNode.signup(fromWif, hotwallet);
          console.log('signup for CrowdNode', cnSignup)
        }
        if (
          cnStatus?.signup > 0 && cnStatus?.accept === 0
        ) {
          this.btn = this.getAttribute('btn') || 'Accept CrowdNode Terms of Service'

          this.render()

          cnAccept = await CrowdNode.accept(fromWif, hotwallet);
          console.log('accept terms of service for CrowdNode', cnAccept)
        }

        document.getElementById('pageLoader').remove()

        // document.signupCrowdNodeForm.querySelector('fieldset').disabled = true

        // document.acceptCrowdNodeForm.querySelector('fieldset').disabled = true

        if (cnSignup && cnAccept) {
          document.body.querySelector('> progress')?.remove()
          this.dialog.querySelector('progress')?.remove()
        }
      }

      this.close()
    }

    window.removeEventListener('set:pass', this.handleSetPass)
    window.addEventListener('set:pass', this.handleSetPass, { once: true })
    this.dialog.addEventListener('close', this.handleClose)
    if (this.handleSubmit) {
      this.form.addEventListener('submit', this.handleSubmit)
    }
    this.form.acceptToS.addEventListener('change', this.handleChange)

    this.dialog.querySelector('figure')
      .insertAdjacentElement('afterbegin', this.form)
  }

  connectedCallback(e) {
    console.log('SignupDialog added to page.', e);
    // updateStyle(this);
  }

  disconnectedCallback(e) {
    console.log('SignupDialog removed from page.', e);

    window.removeEventListener('set:pass', this.handleSetPass)
    this.dialog.removeEventListener('close', this.handleClose)
    this.form.removeEventListener('submit', this.handleSubmit)
    this.form.acceptToS.removeEventListener('change', this.handleChange)
  }

  adoptedCallback(e) {
    console.log('SignupDialog moved to new page.', e);
  }

  attributeChangedCallback(name, oldValue, newValue) {
    console.log('SignupDialog attributes changed.', {name, oldValue, newValue});

    if (name === 'name') {
      this.name = newValue
    } else {
      this[name] = newValue || ''
    }

    window.removeEventListener('set:pass', this.handleSetPass)
    this.dialog.removeEventListener('close', this.handleClose)
    this.form.removeEventListener('submit', this.handleSubmit)
    this.form.acceptToS.removeEventListener('change', this.handleChange)

    this.loadContent()
  }
}

export const init = (
  name = 'signup-dialog',
  con = SignupDialog
) => customElements.define(
  name,
  con,
);

// export const init = (state) => {
//   let defaultState = {
//     n: 'signup-dialog',
//     el: (state) => {
//       globalState = state
//       return SignupDialog
//     }
//   }

//   globalState = {
//     ...defaultState,
//     ...state,
//   }

//   return customElements.define(
//     globalState.n,
//     globalState.el(globalState),
//   );
// }

export default init
