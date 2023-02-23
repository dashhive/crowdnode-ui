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

    this.loadContent = this.loadContent.bind(this);
    this.showModal = this.showModal.bind(this);
    this.close = this.close.bind(this);
    this.listeners = {}

    dialog.innerHTML = `
      <figure>
        <form method="dialog">
          <button value="cancel">Close</button>
        </form>
      </figure>
    `

    this.loadContent()

    dialog.id = this.getAttribute('id') || `${this.name}Modal`

    this.handleChange = () => {}
    this.handleSubmit = () => {}
    this.handleClose = event => {
      // @ts-ignore
      event?.target?.remove()
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

    document.addEventListener('set:pass', this.handleSetPass)
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
    this.dialog?.close()
  }

  showModal(e) {
    this.dialog?.showModal()
  }

  loadContent() {
    // console.log('SignupDialog loadContent', this,
    //   this.addr, this.funds, this.needed, this.msg
    // )

    this.form.setAttribute('name', `${this.name}Form`)

    this.form.innerHTML = `
      <fieldset>
        <label>
          <input name="acceptToS" type="checkbox" />
          I accept the CrowdNode <a href="https://crowdnode.io/terms/" target="_blank">Terms and Conditions</a>
        </label>
        <button name="signup" type="submit" disabled>${this.btn}</button>
      </fieldset>
    `
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


        let cnSignup = await CrowdNode.signup(fromWif, hotwallet);
        console.log('signupCrowdNodeForm', cnSignup)
        let cnAccept = await CrowdNode.accept(fromWif, hotwallet);
        console.log('acceptCrowdNodeForm', cnAccept)

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

    document.addEventListener('set:pass', this.handleSetPass)
    this.dialog.addEventListener('close', this.handleClose)
    this.form.addEventListener('submit', this.handleSubmit)
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

    document.removeEventListener('set:pass', this.handleSetPass)
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

    document.removeEventListener('set:pass', this.handleSetPass)
    this.dialog.removeEventListener('close', this.handleClose)
    this.form.removeEventListener('submit', this.handleSubmit)
    this.form.acceptToS.removeEventListener('change', this.handleChange)
    this.loadContent()
  }
}

export const init = (n = 'signup-dialog', el = SignupDialog) => customElements.define(
  n,
  el,
);

export default init
