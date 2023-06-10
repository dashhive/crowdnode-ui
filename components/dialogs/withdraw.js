import {
  DashSocket,
  DashSight,
  DashApi,
  CrowdNode,
} from '../../imports.js'
import { trigger, toDuff, addrToPubKeyHash } from '../../utils.js'
import {
  getAddrRows,
  getStakeRows,
} from '../../lib/ui.js'
import {
  getStoredKeys,
  getPrivateKey,
} from '../../lib/storage.js'

// @ts-ignore
let dashsight = DashSight.create({
  baseUrl: 'https://dashsight.dashincubator.dev',
});
let dashApi = DashApi.create({ insightApi: dashsight });

const initialState = {
  id: 'Modal',
  name: 'withdraw',
  submitTxt: 'Withdraw Funds',
  submitAlt: 'Withdraw from Dash Wallet',
  cancelTxt: 'Cancel',
  cancelAlt: 'Cancel Dash Withdraw',
}

const { hotwallet } = CrowdNode.main;

export function setupWithdrawDialog(el, state = {}) {
  state = {
    ...initialState,
    ...state,
  }

  // console.log('unstake dialog state', state)

  const dialog = document.createElement('dialog')
  const form = document.createElement('form')
  const progress = document.createElement('progress')

  progress.classList.add('pending')
  form.classList.add('modal')

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
      <h2>Withdraw Dash</h2>

      <label for="withdrawToAddress">
        Pay to Address
      </label>
      <input
        id="withdrawToAddress"
        name="toAddress"
        placeholder="Send to Address"
        spellcheck="false"
      />
      <em>Enter the address you would like to transfer Dash to.</em><br/>

      <label for="withdrawAmount">
        Amount
      </label>
      <input
        id="withdrawAmount"
        type="number"
        name="amount"
        step="0.00000001"
        placeholder="Ðash Amount (0.001)"
      />
      <em>Leave this field blank to transfer the entire available balance.</em>
    </fieldset>
    <fieldset class="inline">
      <button type="reset" title="${state.cancelAlt}">
        <span>${state.cancelTxt}</span>
      </button>
      <button type="submit" title="${state.submitAlt}">
        <span>${state.submitTxt}</span>
      </button>
    </fieldset>
  `

  let handleSetPass = event => {
    event.preventDefault()
    // console.log('unstake dialog handleSetPass', event.detail)
    state.passphrase = event.detail;
  }

  let handleClose = async event => {
    event.preventDefault()
    console.log(`${state.name} modal handleClose`, event)

    window.removeEventListener('set:pass', handleSetPass)
    dialog?.removeEventListener('close', handleClose)
    form?.removeEventListener('submit', handleSubmit)
    form?.removeEventListener('reset', handleReset)

    // @ts-ignore
    event?.target?.remove()

    let { storedKeys } = await getStoredKeys(state.passphrase)
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
  }

  let handleReset = event => {
    event.preventDefault()
    console.log(`${state.name} button handleReset`, event)
    dialog.close('cancel')
  }

  let handleSubmit = async event => {
    event.preventDefault()

    const toAddr = event.target.toAddress?.value
    const toAddrHash = await addrToPubKeyHash(toAddr)
    const amount = event.target.amount?.value
    const duffAmount = toDuff(amount)

    let tx
    let withdrawTransfer

    console.log(
      'withdraw funds amount',
      {
        amount,
        duffAmount,
        fromAddress: state.address,
        toAddr,
        toAddrHash,
        from: state.address
      }
    )

    if (state.address && toAddrHash) {
      let fromWif = await getPrivateKey(state.address, state.passphrase) // , pass

      console.log(
        'privKey',
        state.address,
        state.passphrase?.length,
        fromWif.length
      )

      console.log(
        'WithdrawForm transfer',
        { from: state.address, fromWif, toAddr },
        { amount, duffAmount, }
      )

      dialog.querySelector('figure')
        .insertAdjacentElement('afterbegin', progress)

      form.querySelector('fieldset:last-child').disabled = true

      document.body.insertAdjacentHTML(
        'afterbegin',
        `<progress id="pageLoader" class="pending"></progress>`,
      )

      if (duffAmount) {
        tx = await dashApi.createPayment(
          fromWif,
          toAddr,
          duffAmount,
          // from
        );
      } else {
        tx = await dashApi.createBalanceTransfer(fromWif, toAddr);
      }

      let txs = tx.serialize()

      console.log('WithdrawForm tx', txs)

      const instantSend = await dashsight.instantSend(txs);

      console.log('WithdrawForm instantSend', instantSend)

      withdrawTransfer = await DashSocket.waitForVout(
        CrowdNode._dashsocketBaseUrl,
        toAddr,
        0,
      )

      console.log(
        'WithdrawForm transfer',
        withdrawTransfer,
      )

      // withdrawTransfer.address
      // withdrawTransfer.timestamp
      // withdrawTransfer.txid
      // withdrawTransfer.satoshis
      // withdrawTransfer.txlock
    }

    if (withdrawTransfer.txid && withdrawTransfer.satoshis > 0) {
      document.getElementById('pageLoader').remove()
      dialog.querySelector('progress')?.remove()
    }

    form.querySelector('fieldset:last-child').disabled = false

    dialog.close(withdrawTransfer.txid)
  }

  dialog.addEventListener('close', handleClose)

  form.addEventListener('reset', handleReset)
  form.addEventListener('submit', handleSubmit)

  window.addEventListener('set:pass', handleSetPass) //,  { once: true }

  dialog.querySelector('figure')
    .insertAdjacentElement('afterbegin', form)

  el.insertAdjacentElement('afterend', dialog)

  // dialog.showModal()

  return dialog
}

export default setupWithdrawDialog
