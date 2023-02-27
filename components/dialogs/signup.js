import {
  // DashSocket,
  // DashSight,
  // DashApi,
  CrowdNode,
} from '../../imports.js'
import {
  trigger,
  // toDuff,
  isDecryptedPhraseOrWif,
} from '../../utils.js'
import {
  getAddrRows,
  hasOrRequestFunds,
  requestFunds,
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
      <h2>Signup for CrowdNode</h2>

      <p>To stake your Dash and begin earning interest, read and accept the CrowdNode Terms and Conditions, then fund your wallet to complete the signup process.</p>
    </fieldset>
    <fieldset class="inline">
      <label>
        <input name="acceptToS" type="checkbox" />
        I accept the CrowdNode <a href="https://crowdnode.io/terms/" target="_blank">Terms and Conditions</a>
      </label>
    </fieldset>

    <p><em>This process may take a while, please be patient.</em></p>

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
      document.querySelector('#addressGrid'),
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

    let cnStatus
    let cnSignup
    let cnAccept

    let funds = await hasOrRequestFunds(
      state.address,
      signupTotal,
      'to signup for CrowdNode'
    )

    if (state.address && (
      state.passphrase ||
      isDecryptedPhraseOrWif(state.phraseOrWif)
    )) {
      let fromWif = await getPrivateKey(
        state.address, state.passphrase
      ) // , pass

      console.log(
        'privKey',
        state.address,
        state.passphrase?.length,
        fromWif.length
      )

      dialog.querySelector('figure')
        .insertAdjacentElement('afterbegin', progress)
      form.querySelectorAll('fieldset.inline')?.forEach(el => {
        el.disabled = true
      })

      document.body.insertAdjacentHTML(
        'afterbegin',
        `<progress id="pageLoader" class="pending"></progress>`,
      )

      cnStatus = await CrowdNode.status(state.address, hotwallet);

      console.log('CrowdNode Status', cnStatus)

      if (
        !cnStatus ||
        cnStatus?.signup === 0
      ) {
        cnSignup = await CrowdNode.signup(fromWif, hotwallet);
        console.log('signup for CrowdNode', cnSignup)
      }

      if (
        (
          cnSignup?.satoshis > 0 ||
          cnStatus?.signup > 0
        ) && cnStatus?.accept === 0
      ) {
        state.submitTxt = 'Accept CrowdNode Terms of Service'

        // RE-RENDER FORM

        cnAccept = await CrowdNode.accept(fromWif, hotwallet);
        console.log('accept terms of service for CrowdNode', cnAccept)
      }
    }
    let signupAcceptComplete = cnStatus?.signup > 0 && cnStatus?.accept > 0
    let completeStatus = signupAcceptComplete

    if (cnSignup || cnAccept || (
      cnStatus?.signup > 0 && cnStatus?.accept > 0
    )) {
      document.getElementById('pageLoader')?.remove()
      dialog.querySelector('progress')?.remove()
      form.querySelectorAll('fieldset.inline')?.forEach(el => {
        el.disabled = true
      })
    }

    dialog.close(cnSignup?.txid || cnAccept?.txid || completeStatus || 'cancel')
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
