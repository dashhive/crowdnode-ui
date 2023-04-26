import {
  trigger,
  // toDuff,
} from '../../utils.js'
import {
  getAddrRows,
  getStakeRows,
  // hasOrRequestFunds,
} from '../../lib/ui.js'
import {
  getStoredKeys,
  getPrivateKey,
} from '../../lib/storage.js'
import {
  CrowdNode,
} from '../../imports.js'

const { hotwallet } = CrowdNode.main;

const initialState = {
  id: 'Modal',
  name: 'unstake',
  submitTxt: 'Unstake',
  submitAlt: 'Unstake from CrowdNode',
  cancelTxt: 'Cancel',
  cancelAlt: 'Cancel Unstake',
}

export function setupUnstakeDialog(el, state = {}) {
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
    <fieldset class="nomarginbottom">
      <h2>Unstake from CrowdNode</h2>

      <label for="unstakePercent">
        Percent
      </label>
      <fieldset class="inline nopad">
        <input
          name="percentRange"
          type="range"
          min="0.1"
          max="100.0"
          step="0.1"
          value="1"
        />
        <label class="percent"><input
          id="unstakePercent"
          type="number"
          name="percent"
          step="0.1"
          value="1"
          placeholder="Unstake Percentage (0.1)"
        /></label>
      </fieldset>
      <em>Enter the percentage you wish to unstake.</em>
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
    form?.percentRange?.removeEventListener(
      "input",
      handlePercentRangeInput
    )
    form?.percent?.removeEventListener(
      "input",
      handlePercentInput
    )

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

    console.log('unstake storedKeys', storedKeys)
  }

  let handleReset = event => {
    event.preventDefault()
    console.log(`${state.name} button handleReset`, event)
    form?.removeEventListener('reset', handleReset)
    dialog.close('cancel')
  }

  let percentRangeChanging = false
  let percentChanging = false

  let handlePercentRangeInput = async event => {
    percentRangeChanging = true
    if (!percentChanging) {
      form.percent.value = event.target.value
    }
    percentRangeChanging = false
  }

  let handlePercentInput = async event => {
    percentChanging = true
    if (!percentRangeChanging) {
      form.percentRange.value = event.target.value
    }
    percentChanging = false
  }

  let handleSubmit = async event => {
    event.preventDefault()

    const percent = event.target.percent?.value
    const percentRange = event.target.percentRange?.value

    console.log(
      'unstake from crowdnode',
      {
        address: state.address,
        percent,
        percentRange
      }
    )

    let cnUnstake

    if (state.address) {
      let fromWif = await getPrivateKey(state.address, state.passphrase) // , pass

      let permil = Math.round(percent * 10);
      if (permil <= 0 || permil > 1000) {
        console.error("Error: withdraw percent must be between 0.1 and 100.0");
      }

      let realPercentStr = (permil / 10).toFixed(1);
      console.info(`Initiating withdraw of ${realPercentStr}%...`);

      console.log(
        'privKey',
        state.address,
        state.passphrase?.length,
        fromWif.length
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
        cnUnstake = await CrowdNode.withdraw(
          fromWif,
          hotwallet,
          permil
        );

        console.log(
          'crowdnode unstake res',
          cnUnstake
        )
        console.info(`API Response: ${cnUnstake.api}`);

        // event.target.percent.value = null

        // await displayBalances(addr)
      } catch(err) {
        console.warn('failed to unstake from crowdnode', err)
      }
      form.querySelector('fieldset:last-child').disabled = false
    }

    if (cnUnstake) {
      document.getElementById('pageLoader').remove()
      dialog.querySelector('progress')?.remove()
    }

    dialog.close(cnUnstake)
  }

  dialog.addEventListener('close', handleClose)

  form.addEventListener('reset', handleReset)
  form.addEventListener('submit', handleSubmit)

  form?.percentRange?.addEventListener(
    "input",
    handlePercentRangeInput
  )
  form?.percent?.addEventListener(
    "input",
    handlePercentInput
  )

  window.addEventListener('set:pass', handleSetPass) //,  { once: true }

  dialog.querySelector('figure')
    .insertAdjacentElement('afterbegin', form)

  el.insertAdjacentElement('afterend', dialog)

  // dialog.showModal()

  return dialog
}

export default setupUnstakeDialog
