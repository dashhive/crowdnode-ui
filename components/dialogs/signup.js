import {
  // DashSocket,
  // DashSight,
  // DashApi,
  CrowdNode,
} from '../../imports.js'
import {
  trigger,
  // toDuff,
} from '../../utils.js'
import {
  getAddrRows,
  hasOrRequestFunds,
} from '../../lib/ui.js'
import {
  getStoredKeys,
  getPrivateKey,
} from '../../lib/storage.js'

// @ts-ignore
// let dashsight = DashSight.create({
//   baseUrl: 'https://dashsight.dashincubator.dev',
// });

const { hotwallet } = CrowdNode.main;
// const { depositMinimum, stakeMinimum } = CrowdNode
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

export function setupSignupDialog(el, state = {}) {
  state = {
    ...initialState,
    ...state,
  }

  // console.log('signup dialog state', state)

  const dialog = document.createElement('dialog')
  const form = document.createElement('form')
  const progress = document.createElement('progress')

  progress.classList.add('pending')

  dialog.innerHTML = `
    <figure>
    </figure>
  `

  dialog.id = `${state.name}${state.id}`
  dialog.classList.add('responsive')

  form.name = `${state.name}Form`
  form.method = 'dialog'

  form.innerHTML = `
    <fieldset>
      <label>
        <input name="acceptToS" type="checkbox" />
        I accept the CrowdNode <a href="https://crowdnode.io/terms/" target="_blank">Terms and Conditions</a>
      </label>
    </fieldset>
    <fieldset class="inline">
      <button type="reset" title="${state.cancelAlt}">
        <span>${state.cancelTxt}</span>
      </button>
      <button name="signup" type="submit" title="${state.submitAlt}" disabled>
        <span>${state.submitTxt}</span>
      </button>
    </fieldset>
  `

  let handleSetPass = event => {
    event.preventDefault()
    console.log('signup dialog handleSetPass', event.detail)
    state.passphrase = event.detail;
  }

  let handleClose = async event => {
    event.preventDefault()
    console.log(`${state.name} modal handleClose`, event)

    window.removeEventListener('set:pass', handleSetPass)
    dialog?.removeEventListener('close', handleClose)
    form?.acceptToS?.removeEventListener('change', handleChange)
    // @ts-ignore
    event?.target?.remove()

    let storedKeys = await getStoredKeys(state.passphrase)

    await getAddrRows(
      document.querySelector('#addressGrid section'),
      storedKeys,
      {
        status: () => trigger("set:pass", state.passphrase),
        passphrase: state.passphrase
      }
    )

    console.log('storedKeys', storedKeys)
  }

  let handleReset = event => {
    event.preventDefault()
    console.log(`${state.name} button handleReset`, event)
    form?.removeEventListener('close', handleReset)
    dialog.close('cancel')
  }

  let handleChange = async event => {
    console.log(
      'signup handleChange',
      {
        event,
        eventTarget: event.target,
        acceptToS: form.acceptToS.checked,
        address: state.address
      }
    )

    form.signup.disabled = !form.acceptToS.checked
  }

  let handleSubmit = async event => {
    event.preventDefault()

    const acceptToS = event.target.acceptToS?.checked

    console.log(
      'signup for crowdnode',
      {
        acceptToS,
        address: state.address
      }
    )

    let cnSignup
    let cnAccept

    if (state.address && state.passphrase) {
      console.log(
        'signup privKey',
        state.address,
        state.passphrase,
      )
      let fromWif = await getPrivateKey(
        state.address, state.passphrase
      ) // , pass

      console.log(
        'privKey',
        state.address,
        state.passphrase.length,
        fromWif.length
      )

      let funds = await hasOrRequestFunds(
        state.address,
        signupTotal,
        'to signup for CrowdNode'
      )

      dialog.querySelector('figure')
        .insertAdjacentElement('afterbegin', progress)
      form.querySelector('fieldset:last-child').disabled = true

      document.body.insertAdjacentHTML(
        'afterbegin',
        `<progress id="pageLoader" class="pending"></progress>`,
      )

      let cnStatus = await CrowdNode.status(state.address, hotwallet);

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
        state.submitTxt = 'Accept CrowdNode Terms of Service'

        // RE-RENDER FORM

        cnAccept = await CrowdNode.accept(fromWif, hotwallet);
        console.log('accept terms of service for CrowdNode', cnAccept)
      }
    }

    if (cnSignup && cnAccept) {
      document.getElementById('pageLoader')?.remove()
      dialog.querySelector('progress')?.remove()
    }

    dialog.close(cnSignup || 'cancel')
  }

  dialog.addEventListener('close', handleClose)

  form.addEventListener('reset', handleReset)
  form.addEventListener('submit', handleSubmit)
  form.acceptToS?.addEventListener('change', handleChange)

  window.addEventListener('set:pass', handleSetPass) //,  { once: true }

  dialog.querySelector('figure')
    .insertAdjacentElement('afterbegin', form)

  el.insertAdjacentElement('afterend', dialog)

  // dialog.showModal()

  return dialog
}

export default setupSignupDialog
