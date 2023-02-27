import { toDash, isDecryptedPhraseOrWif } from '../utils.js'
import {
  DashSocket,
  DashSight,
  CrowdNode,
} from '../imports.js'

import setupSignupButton from '../components/forms/signup.js'
import setupStakeButton from '../components/forms/stake.js'
import setupUnstakeButton from '../components/forms/unstake.js'
import setupWithdrawButton from '../components/forms/withdraw.js'
import setupDepositButton from '../components/forms/deposit.js'
import setupQrDialog from '../components/dialogs/qr.js'

// @ts-ignore
let dashsight = DashSight.create({
  baseUrl: 'https://dashsight.dashincubator.dev',
});

/** @type {document} */
const $d = document;

const { hotwallet } = CrowdNode.main;
const { depositMinimum, stakeMinimum } = CrowdNode
const { signupForApi, acceptTerms, offset } = CrowdNode.requests;
let feeEstimate = 500;
let signupOnly = signupForApi + offset;
let acceptOnly = acceptTerms + offset;
let signupFees = signupOnly + acceptOnly;

/**
 * `hasOrRequestFunds` checks if the current wallet has the
 * funds required, if not it displays the QR Code SVG request
 * and awaits funding, if it does have enough funds it
 * returns the values
 *
 * @param {string} addr
 * @param {number} requiredFunds
 * @param {string} [msg]
 * @param {function} [callback]
 * @returns {Promise<Object, number>}
 */
export async function hasOrRequestFunds(addr, requiredFunds, msg, callback = () => {}) {
  let walletFunding
  let walletFunds = await checkWalletFunds(addr)
  let fees = walletFunds.balanceSat < feeEstimate ?
    feeEstimate - walletFunds.balanceSat : 0
  let fundsAndFees = requiredFunds + fees
  let fundsNeeded = walletFunds.balanceSat < fundsAndFees

  console.log(
    'hasOrRequestFunds',
    walletFunds.balanceSat,
    fundsAndFees,
    fundsNeeded
  )

  if (fundsNeeded) {
    let fundingModal = setupQrDialog(
      $d.querySelector("main"),
      {
        address: addr,
        funds: walletFunds,
        needed: fundsAndFees,
        msg
      }
    )

    console.log('hasOrRequestFunds fundingModal', fundingModal)

    fundingModal?.showModal();

    // @ts-ignore
    walletFunding = await DashSocket.waitForVout(
      CrowdNode._dashsocketBaseUrl,
      addr,
      0,
    )

    if (walletFunding.satoshis < fundsAndFees) {
      await hasOrRequestFunds(addr, fundsAndFees, msg)
    }
  }

  return {
    walletFunds,
    fundsNeeded
  }
}

/**
 * `requestFunds` displays the QR Code SVG request
 * and awaits funding
 *
 * @param {string} addr
 * @param {string} [msg]
 * @param {function} [callback]
 *
 * @returns {Promise<Object, number>}
 */
export async function requestFunds(addr, msg, callback = () => {}) {
  let walletFunding
  let walletFunds = await checkWalletFunds(addr)
  let fees = walletFunds.balanceSat < feeEstimate ?
    feeEstimate - walletFunds.balanceSat : 0

  console.log(
    'requestFunds',
    walletFunds.balanceSat,
  )

  let fundingModal = setupQrDialog(
    $d.querySelector("main"),
    {
      address: addr,
      funds: walletFunds,
      needed: fees,
      msg
    }
  )

  console.log('requestFunds fundingModal', fundingModal)

  fundingModal?.showModal();

  // @ts-ignore
  walletFunding = await DashSocket.waitForVout(
    CrowdNode._dashsocketBaseUrl,
    addr,
    0,
  )

  if (walletFunding.satoshis > 0) {
    fundingModal?.close()
    walletFunds.balance = parseFloat(toDash(walletFunding.satoshis))
    walletFunds.balanceSat = walletFunding.satoshis
  }

  return {
    walletFunds
  }
}

export function copyToClipboard(event) {
  event.preventDefault()
  // let copyText = document.querySelector(sel);
  event.target.previousElementSibling.select();
  document.execCommand("copy");
}

export async function checkWalletFunds(addr) {
  let walletFunds = await dashsight.getInstantBalance(addr)

  // console.info('check wallet funds', walletFunds)

  return walletFunds
}

export async function getBalance(address) {
  return await CrowdNode.http.GetBalance(
    address
  );
}

export async function displayWalletBalance(addr, funds) {
  let walletFunds = funds || await checkWalletFunds(addr)

  if (walletFunds) {
    let msg = `<format-to-dash value="${walletFunds.balance}" />`

    $d.querySelector('header .dash-status .balance')
      .insertAdjacentHTML('beforeend', msg)
  }

  return walletFunds
}

export async function displayCrowdNodeBalance(addr, funds) {
  let balance = funds || await getBalance(addr)

  if (balance?.TotalBalance) {
    console.info(
      balance
    );

    $d.querySelector('header .cn-status .balance')
      .insertAdjacentHTML(
        'beforeend',
        `<format-to-dash value="${balance.TotalBalance}" />`
      )
    $d.querySelector('header .cn-status .dividends')
      .insertAdjacentHTML(
        'beforeend',
        `<format-to-dash value="${balance.TotalDividend}" />`
      )
  }

  return balance
}

export function balanceEl(balance, dec = 4) {
  return `<format-to-dash value="${balance}" decimal="${dec}" />`
}

export async function getStatusCN(addr) {
  let status = await CrowdNode.status(addr, hotwallet);

  return (
    !status ||
    status?.signup === 0 ||
    status?.signup > 0 && status?.accept === 0
  )
}

export async function displayAddressBalance(addr, funds) {
  let walletFunds = funds || await checkWalletFunds(addr)

  if (walletFunds) {
    return balanceEl(walletFunds.balance)
  }

  return balanceEl(0)
}

export async function displayCNAddrBalance(addr, funds) {
  let balance = funds || await getBalance(addr)

  if (balance?.TotalBalance) {
    return `
      ${balanceEl(balance.TotalBalance)}
      ${balanceEl(balance.TotalDividend)}
    `
  }

  return balanceEl(0)
}

export async function displayBalances(addr, funds, cnBalance) {
  let bd = $d.querySelectorAll('header .balance, header .dividends')
    .forEach(el => el.querySelector('span')?.remove())

  console.log('displayBalances & dividends', bd)

  const wallet = await displayWalletBalance(addr, funds)
  const balance = await displayCrowdNodeBalance(addr, cnBalance)

  return {
    wallet,
    balance
  }
}

export async function getAddrRows(el, keys, state = {}) {
  // console.log('getAddrRows el', el)
  let rowType = el.nodeName === 'TBODY' ?
    'tr' : 'article'
  let colType = el.nodeName === 'TBODY' ?
    'td' : 'div'

  for (let [pub, priv] of keys) {
    let foundRow = el.querySelector(`#row_${pub}`)
    let row = foundRow

    // console.log('getAddrRows foundRow', `tr#row_${pub}`, foundRow)

    if (!foundRow) {
      row = document.createElement(rowType)
      row.id = `row_${pub}`
      row.innerHTML = `
        <${colType}></${colType}>
        <${colType}></${colType}>
        <${colType} id="deposit_${pub}"></${colType}>
        <${colType} id="da_${pub}"></${colType}>
        <${colType} id="withdraw_${pub}"></${colType}>
        <${colType} id="cn_${pub}"></${colType}>
        <${colType} id="stake_${pub}"></${colType}>
        <${colType} id="unstake_${pub}"></${colType}>
      `
    }

    displayAddressBalance(pub)
      .then(b => {
        row.querySelector(`#da_${pub}`).innerHTML = b
        if (state.balance) {
          state.balance()
        }
      })
    displayCNAddrBalance(pub)
      .then(b => {
        row.querySelector(`#cn_${pub}`).innerHTML = b
        if (state.staked) {
          state.staked()
        }
      })
    getStatusCN(pub)
      .then(status => {
        let stk = row.querySelector(`#stake_${pub}`)
        let unstk = row.querySelector(`#unstake_${pub}`)
        stk.innerHTML = ''
        unstk.innerHTML = ''
        if (status) {
          setupSignupButton(stk, {
            submitTxt: '✍',
            address: pub,
            phraseOrWif: priv,
            passphrase: state.passphrase
          })
        } else {
          setupUnstakeButton(unstk, {
            submitTxt: '🥡',
            address: pub,
            phraseOrWif: priv,
            passphrase: state.passphrase
          })
          setupStakeButton(stk, {
            submitTxt: '🥩',
            address: pub,
            phraseOrWif: priv,
            passphrase: state.passphrase
          })
        }
        if (state.status) {
          state.status()
        }
      })

    let tds = row.querySelectorAll(colType)
    tds[0].textContent = isDecryptedPhraseOrWif(priv) ? '🔓' : '🔐'
    tds[1].innerHTML = `<strong>${pub}</strong>`

    setupDepositButton(tds[2], {
      submitTxt: '📥',
      address: pub,
      phraseOrWif: priv,
      passphrase: state.passphrase
    })
    setupWithdrawButton(tds[4], {
      submitTxt: '📤',
      address: pub,
      phraseOrWif: priv,
      passphrase: state.passphrase
    })

    if (!foundRow) {
      el.insertAdjacentElement('afterbegin', row)
    }
  }

  return el
}