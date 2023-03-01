import { qrSvg, } from '../../qr.js'
import {
  trigger, toDash, // toDuff,
} from '../../utils.js'
import {
  getAddrRows,
  getStakeRows,
  // hasOrRequestFunds,
  copyToClipboard,
} from '../../lib/ui.js'
import {
  getStoredKeys,
  // getPrivateKey,
} from '../../lib/storage.js'
// import {
//   CrowdNode,
// } from '../../imports.js'

// const { hotwallet } = CrowdNode.main;
// const { depositMinimum, stakeMinimum } = CrowdNode
let feeEstimate = 500;

const initialState = {
  id: 'Modal',
  name: 'qr',
  // submitTxt: 'Encrypt/Decrypt',
  // submitAlt: 'Encrypt/Decrypt Wallet',
  cancelTxt: 'Cancel',
  cancelAlt: 'Cancel',
}

export function setupQrDialog(el, state = {}) {
  state = {
    ...initialState,
    ...state,
  }
  // if (name === 'funds') {
  //   state.funds = JSON.parse(newValue)
  // } else if (name === 'needed') {
  //   state.needed = Number(newValue) || 0
  // } else {
  //   this[name] = newValue || ''
  // }

  console.log('qr dialog state', state)

  const dialog = document.createElement('dialog')
  const form = document.createElement('form')
  const progress = document.createElement('progress')

  progress.classList.add('pending')

  dialog.innerHTML = `
    <figure>
      <progress class="pending"></progress>
    </figure>
  `

  dialog.id = `${state.name}${state.id}`
  dialog.classList.add('responsive')

  form.name = `${state.name}CopyAddr`
  form.method = 'dialog'

  let handleSetPass = event => {
    event.preventDefault()
    console.log('qr dialog handleSetPass', event.detail)
    state.passphrase = event.detail;
  }

  let handleClose = async event => {
    event.preventDefault()
    console.log(`${state.name} modal handleClose`, event)

    window.removeEventListener('set:pass', handleSetPass)
    dialog?.removeEventListener('close', handleClose)
    // @ts-ignore
    event?.target?.remove()

    if (dialog.returnValue !== 'cancel') {
      let storedKeys = await getStoredKeys(state.passphrase)

      await getAddrRows(
        document.querySelector('#addressGrid'),
        storedKeys,
        {
          status: () => trigger("set:pass", state.passphrase),
          passphrase: state.passphrase
        }
      )
      await getStakeRows(
        document.querySelector('#stakingGrid'),
        storedKeys,
        {
          status: () => trigger("set:pass", state.passphrase),
          passphrase: state.passphrase
        }
      )

      console.log('storedKeys', storedKeys)
    } else {
      // Hack to kill WebSocket listener
      location.reload()
    }
  }

  let handleReset = event => {
    event.preventDefault()
    console.log(`${state.name} button handleReset`, event)
    form?.removeEventListener('close', handleReset)
    dialog.close('cancel')
  }

  let dashSvg = qrSvg(
    `dash://${state.address}`,
    {
      background: '#fff0',
      color: 'currentColor',
      indent: 1,
      padding: 1,
      size: 'mini',
      container: 'svg-viewbox',
      join: true,
    }
  )

  let fundingDiff = '<p>Deposit Dash (Đ) to this address to get started.</p>'

  if (state.needed > feeEstimate) {
    fundingDiff = `<p>
      You must deposit at least <strong><format-to-dash value="${toDash(state.needed)}" /></strong> ${state.msg}
    </p>`
  }

  if (state.funds?.balanceSat >= 0) {
    if (
      state.funds.balanceSat > 0 &&
      state.funds.balanceSat < state.needed
    ) {
      fundingDiff = `
        <p>You have <strong><format-to-dash value="${toDash(state.funds.balanceSat)}" /></strong> in your wallet.<br>This step requires <strong><format-to-dash value="${toDash(state.needed)}" /></strong>.</p>
        <p>You must deposit at least <strong><format-to-dash value="${toDash(state.needed - state.funds.balanceSat)}" /></strong> more Dash ${state.msg}</p>
      `
    }
  }

  form.innerHTML = `
    <h4>Current Wallet Balance</h4>
    <h3><format-to-dash value="${state.funds.balance}" /></h3>
    ${dashSvg}
    <figcaption>
      <fieldset class="inline">
        <input name="qrAddr" value="${state.address}" spellcheck="false" />
        <button class="copy">📋</button>
      </fieldset>
      ${fundingDiff}
    </figcaption>

    <fieldset class="inline">
      <button type="reset" value="cancel" alt="${state.cancelAlt}">
        <span>${state.cancelTxt}</span>
      </button>
    </fieldset>
  `

  dialog.addEventListener('close', handleClose)

  form.addEventListener('reset', handleReset)

  window.addEventListener('set:pass', handleSetPass) //,  { once: true }

  dialog.querySelector('figure')
    .insertAdjacentElement('afterbegin', form)

  form.querySelector('button.copy')?.addEventListener('click', copyToClipboard)

  el.insertAdjacentElement('afterend', dialog)

  // dialog.showModal()

  return dialog
}

export default setupQrDialog
