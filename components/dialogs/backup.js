import {
  trigger, toDash, // toDuff,
} from '../../utils.js'
import {
  getAddrRows,
  getStakeRows,
  // copyToClipboard,
  setClipboard,
} from '../../lib/ui.js'
import {
  getStoredKeys,
  // getPrivateKey,
} from '../../lib/storage.js'

const initialState = {
  id: 'Modal',
  name: 'backup',
  // submitTxt: 'Verify',
  // submitAlt: 'Verify Recovey Phrase is Backed Up',
  cancelTxt: 'Close',
  cancelAlt: 'Close',
  copyTxt: '📋',
  copyAlt: 'Copy Recovery Phrase or WIF',
}

export async function setupBackupRecoveryPhraseDialog(el, state = {}) {
  state = {
    ...initialState,
    ...state,
  }

  // console.log('backup dialog state', state)

  let storedKeys = await getStoredKeys(state.passphrase)

  const dialog = document.createElement('dialog')
  const form = document.createElement('form')

  dialog.innerHTML = `
    <figure>
    </figure>
  `

  dialog.id = `${state.name}${state.id}`
  dialog.classList.add('responsive')

  form.name = `${state.name}Backup`
  form.method = 'dialog'

  let handleSetPass = event => {
    event.preventDefault()
    // console.log('backup dialog handleSetPass', event.detail)
    state.passphrase = event.detail;
  }

  let handleClose = async event => {
    event.preventDefault()
    // console.log(`${state.name} modal handleClose`, event)

    window.removeEventListener('set:pass', handleSetPass)
    dialog?.removeEventListener('close', handleClose)
    // @ts-ignore
    event?.target?.remove()

    if (dialog.returnValue !== 'cancel') {
      // let storedKeys = await getStoredKeys(state.passphrase)

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
    } else {
      storedKeys = await getStoredKeys(state.passphrase)
    }
    //  else {
    //   location.reload()
    // }
  }

  let handleReset = event => {
    event.preventDefault()
    // console.log(`${state.name} button handleReset`, event)
    form?.removeEventListener('close', handleReset)
    dialog.close('cancel')
  }

  let keysToBackup = []

  if (state.recoveryPhrase) {
    keysToBackup.push([state.address, state.recoveryPhrase])
  } else {
    keysToBackup = storedKeys
  }

  form.innerHTML = `
    <fieldset>
      <h2>Backup Recovery Phrase</h2>

      <center>
        <p>Write your recovery phrase(s) down on a piece of paper or print it out.</p>
        <p>Store it somewhere safe, like Scrooge McDuck's money bin.<br/>
        (or a vault or safe if you don't have your own money bin)</p>
      </center>

      ${
        keysToBackup.map(([pub,recovery]) => `
          <section>
            <strong>${pub}</strong>
              <article>
                <div class="ta-left">${
                  recovery.split(' ')
                    .map(w => `<span class="tag">${w}</span>`)
                    .join(' ')
                }</div>
                <button class="copy" title="${state.copyAlt}">${state.copyTxt}</button>
            </article>
          </section>
        `).join('\n')
      }

      <p>
        <strong class="t-warn" style="text-transform:uppercase;">If you lose your recovery phrase(s), there are no other backups.</strong>
      </p>
    </fieldset>

    <fieldset class="inline">
      <button type="reset" value="cancel" alt="${state.cancelAlt}">
        <span>${state.cancelTxt}</span>
      </button>
    </fieldset>
  `

  dialog.addEventListener('close', handleClose)

  form.addEventListener('reset', handleReset)

  window.addEventListener('set:pass', handleSetPass)

  dialog.querySelector('figure')
    .insertAdjacentElement('afterbegin', form)

  // form.querySelector('button.copy')
  //   ?.addEventListener('click', setClipboard)

  form.addEventListener('click', event => {
    // @ts-ignore
    if (event.target?.classList?.contains('copy')) {
      setClipboard(event)
    }
  })

  el.insertAdjacentElement('afterend', dialog)

  return dialog
}

export default setupBackupRecoveryPhraseDialog
