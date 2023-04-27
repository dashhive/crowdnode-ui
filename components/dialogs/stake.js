import {
  trigger, toDuff
} from '../../utils.js'
import {
  getAddrRows,
  getStakeRows,
  hasOrRequestFunds,
} from '../../lib/ui.js'
import {
  getStoredKeys,
  getPrivateKey,
} from '../../lib/storage.js'
import {
  CrowdNode,
} from '../../imports.js'

const { hotwallet } = CrowdNode.main;
const { depositMinimum, stakeMinimum } = CrowdNode

const initialState = {
  id: 'Modal',
  name: 'stake',
  submitTxt: 'Stake',
  submitAlt: 'Stake in CrowdNode',
  cancelTxt: 'Cancel',
  cancelAlt: 'Cancel Stake',
}

export function setupStakeDialog(el, state = {}) {
  state = {
    ...initialState,
    ...state,
  }

  // console.log('stake dialog state', state)

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
      <h2>Stake in CrowdNode</h2>

      <label for="stakeAmount">
        Amount
      </label>
      <input
        id="stakeAmount"
        type="number"
        name="amount"
        step="0.00000001"
        placeholder="Ðash Amount (0.001)"
      />
      <em>Enter the amount you wish to stake or leave empty to stake entire balance.</em>
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
    // console.log('stake dialog handleSetPass', event.detail)
    state.passphrase = event.detail;
  }

  let handleClose = async event => {
    event.preventDefault()
    console.log(`${state.name} modal handleClose`, event)

    window.removeEventListener('set:pass', handleSetPass)
    dialog?.removeEventListener('close', handleClose)
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
    await getStakeRows(
      document.querySelector('#stakingGrid'),
      storedKeys,
      {
        status: () => trigger("set:pass", state.passphrase),
        passphrase: state.passphrase
      }
    )

    // console.log('storedKeys', storedKeys)
  }

  let handleReset = event => {
    event.preventDefault()
    console.log(`${state.name} button handleReset`, event)
    form?.removeEventListener('close', handleReset)
    dialog.close('cancel')
  }

  let handleSubmit = async event => {
    event.preventDefault()

    const amount = event.target.amount?.value

    console.log(
      'stake from crowdnode',
      {
        address: state.address,
        amount,
      }
    )

    let cnStake

    if (state.address) {
      let fromWif = await getPrivateKey(state.address, state.passphrase) // , pass

      let depositAmount = toDuff(amount)
      if (depositAmount < depositMinimum) {
        depositAmount = depositMinimum
      }

      console.log(
        'privKey',
        state.address,
        state.passphrase?.length,
        fromWif.length
      )

      await hasOrRequestFunds(
        state.address,
        depositAmount,
        'to stake in CrowdNode'
      )

      dialog.querySelector('figure')
        .insertAdjacentElement('afterbegin', progress)

      document.body.insertAdjacentHTML(
        'afterbegin',
        `<progress id="pageLoader" class="pending"></progress>`,
      )
      form.querySelectorAll('fieldset')?.forEach(el => {
        el.disabled = true
      })

      try {
        cnStake = await CrowdNode.deposit(
          fromWif,
          hotwallet,
          depositAmount || null
        );

        console.log(
          'crowdnode stake res',
          cnStake
        )
        console.info(`API Response: ${cnStake.api}`);

        event.target.amount.value = null

        // await displayBalances(addr)
      } catch(err) {
        console.warn('failed to stake in crowdnode', err)
      }
    }

    if (cnStake) {
      document.getElementById('pageLoader').remove()
      dialog.querySelector('progress')?.remove()
    }

    dialog.close(cnStake)
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

export default setupStakeDialog
