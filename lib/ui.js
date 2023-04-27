import { toDash, isDecryptedPhraseOrWif } from '../utils.js'
import {
  DashSocket,
  DashSight,
  CrowdNode,
} from '../imports.js'
// import {
//   getPrivateKey,
// } from './storage.js'

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

export function setClipboard(event) {
  event.preventDefault()
  let el = event.target?.previousElementSibling
  let val = el.textContent
  if (el.nodeName === 'INPUT') {
    val = el.value
  }
  const type = "text/plain";
  const blob = new Blob([val], { type });
  const data = [new ClipboardItem({ [type]: blob })];

  navigator.clipboard.write(data).then(
    (cv) => {
      /* success */
      console.log('setClipboard', cv)
    },
    (ce) => {
      console.error('setClipboard fail', ce)
      /* failure */
    }
  );
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
  return `<format-to-dash value="${balance}" decimal="${dec}"></format-to-dash>`
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
    return [
      balanceEl(walletFunds.balance),
      walletFunds.balance
    ]
  }

  return [balanceEl(0), 0]
}

export async function displayCNAddrBalance(addr, funds) {
  let balance = funds || await getBalance(addr)

  if (balance?.TotalBalance) {
    return [
      `
        ${balanceEl(balance.TotalBalance)}
        ${balanceEl(balance.TotalDividend)}
      `,
      balance.TotalBalance,
      balance.TotalDividend
    ]
  }

  return [balanceEl(0), 0, 0]
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

export async function getAddrRows(container, keys, state = {}) {
  let dashBalance = 0
  let dashFiat = JSON.parse(localStorage.getItem('fiat')) || {}

  let el = container.querySelector('tbody,section')
  // console.log('getAddrRows el', container, el)
  let rowType = el.nodeName === 'TBODY' ?
    'tr' : 'article'
  let colType = el.nodeName === 'TBODY' ?
    'td' : 'div'

  container.parentElement.querySelector('.nowallets')?.remove()

  if (keys.length > 0) {
    container.classList.remove('hidden')
  } else {
    container.insertAdjacentHTML('beforebegin', `
      <h4 class="nowallets"><em>Looks like you need to add or generate a new wallet.</em></h4>
    `)
  }

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
        <${colType} class="deposit-col"></${colType}>
        <${colType} class="dash-addr-balance-col"></${colType}>
        <${colType} class="withdraw-col"></${colType}>
      `
    }

    displayAddressBalance(pub)
      .then(([el, b]) => {
        row.querySelector(`.dash-addr-balance-col`).innerHTML = el

        if (dashFiat?.price) {
          const priceWithSymbol = getFormattedPrice(
            dashFiat.quoteCurrency,
            dashFiat.price * b
          )
          row.querySelector(`.dash-addr-balance-col`).insertAdjacentHTML(
            'beforeend',
            `<sup><em title="Ð ${b} = ${priceWithSymbol} ${dashFiat.quoteCurrency}">${priceWithSymbol}</em></sup>`
          )
        }

        dashBalance += b

        container.querySelector('.db').innerHTML = balanceEl(dashBalance)

        if (state.balance) {
          state.balance()
        }
      })

    let tds = row.querySelectorAll(colType)
    tds[0].textContent = isDecryptedPhraseOrWif(priv) ? '🔓' : '🔐'
    tds[0].title = isDecryptedPhraseOrWif(priv) ? 'Unlocked' : 'Locked'
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

export async function getStakeRows(container, keys, state = {}) {
  let dashFiat = JSON.parse(localStorage.getItem('fiat')) || {}
  let dashBalance = 0
  let cnBalance = 0

  let el = container.querySelector('tbody,section')
  // console.log('getAddrRows el', container, el)
  let rowType = el.nodeName === 'TBODY' ?
    'tr' : 'article'
  let colType = el.nodeName === 'TBODY' ?
    'td' : 'div'

  if (keys.length > 0) {
    container.classList.remove('hidden')
    container.parentElement.querySelector('.nowallets')?.remove()
  } else {
    container.insertAdjacentHTML('beforebegin', `
      <h4 class="nowallets"><em>Looks like you need to add or generate a new wallet.</em></h4>
    `)
  }

  for (let [pub, priv] of keys) {
    let foundRow = el.querySelector(`#s_row_${pub}`)
    let row = foundRow
    let fromWif

    // if (state.passphrase) {
    //   fromWif = await getPrivateKey(
    //     pub, state.passphrase
    //   )
    // }

    console.log(
      'getAddrRows foundRow',
      `tr#s_row_${pub}`,
      foundRow,
      fromWif
    )

    if (!foundRow) {
      row = document.createElement(rowType)
      row.id = `s_row_${pub}`
      row.innerHTML = `
        <${colType}></${colType}>
        <${colType}></${colType}>
        <${colType} class="dash-addr-balance-col"></${colType}>
        <${colType} class="crowdnode-balance-col"></${colType}>
        <${colType} class="stake-col"></${colType}>
        <${colType} class="unstake-col"></${colType}>
      `
    }

    displayAddressBalance(pub)
      .then(([el, b]) => {
        row.querySelector(`.dash-addr-balance-col`).innerHTML = el

        if (dashFiat?.price) {
          const priceWithSymbol = getFormattedPrice(
            dashFiat.quoteCurrency,
            dashFiat.price * b
          )
          row.querySelector(`.dash-addr-balance-col`).insertAdjacentHTML(
            'beforeend',
            `<sup><em title="Ð ${b} = ${priceWithSymbol} ${dashFiat.quoteCurrency}">${priceWithSymbol}</em></sup>`
          )
        }

        dashBalance += b

        container.querySelector('.db').innerHTML = balanceEl(dashBalance)

        if (state.balance) {
          state.balance()
        }
      })

    displayCNAddrBalance(pub)
      .then(([el, b, d]) => {
        console.log('getStakeRows displayCNAddrBalance', el, b)
        row.querySelector(`.crowdnode-balance-col`).innerHTML = el

        if (dashFiat?.price) {
          const balanceWithSymbol = getFormattedPrice(
            dashFiat.quoteCurrency,
            dashFiat.price * b
          )
          const dividendWithSymbol = getFormattedPrice(
            dashFiat.quoteCurrency,
            dashFiat.price * d
          )
          row.querySelector(`.crowdnode-balance-col`).insertAdjacentHTML(
            'afterbegin',
            `<sub><em title="Ð ${b} = ${balanceWithSymbol} ${dashFiat.quoteCurrency}">${balanceWithSymbol}</em></sub>`
          )
          row.querySelector(`.crowdnode-balance-col`).insertAdjacentHTML(
            'beforeend',
            `<sup><strong title="+${dividendWithSymbol} in Dividends">+${dividendWithSymbol}</strong></sup>`
          )
        }

        cnBalance += b

        container.querySelector('.cb').innerHTML = balanceEl(cnBalance)

        if (state.staked) {
          state.staked()
        }
      })
    getStatusCN(pub)
      .then(status => {
        let stk = row.querySelector(`.stake-col`)
        let unstk = row.querySelector(`.unstake-col`)
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
    tds[0].title = isDecryptedPhraseOrWif(priv) ? 'Unlocked' : 'Locked'
    tds[1].innerHTML = `<strong>${pub}</strong>`

    if (!foundRow) {
      el.insertAdjacentElement('afterbegin', row)
    }
  }

  return el
}

export async function getCurrencies(symbol) {
  let rateUrl = new URL(
    'https://rates2.dashretail.org/rates?source=dashretail&%7B%7D='
  )
  if (symbol) {
    if (!symbol.startsWith('DASH')) {
      symbol = `DASH${symbol}`
    }
    rateUrl.searchParams.append('symbol', symbol)
  }
  return await fetch(
    rateUrl
  )
    .then(async response => await response?.json())
    .then(
      async list => await list.filter(
        ({ baseCurrency }) => baseCurrency?.toUpperCase() === 'DASH'
      )
    )
  }

export function getFormattedPrice(
  symbol,
  price,
  lang = `en-US`
) {
  return new Intl.NumberFormat(lang, {
    currency: symbol,
    style: 'currency',
  }).format(price)
}

export async function updateFiatDisplay(el, symbol) {
  let [fiat] = await getCurrencies(symbol)

  console.log('updateFiatDisplay', fiat)

  const priceWithSymbol = getFormattedPrice(
    fiat.quoteCurrency, fiat.price
  )

  el.innerHTML = ''
  el.insertAdjacentHTML(
    'beforeend',
    `<span>Ð1 ${fiat.baseCurrency} = ${priceWithSymbol}</span>`
  )

  return fiat
}

export async function displayVersionInfo(container, settings) {
  return await fetch(`package.json?cb=${new Date().getTime()}`)
    .then(async response => await response.json())
    .then(async pkg => {
      let installedVersion = (await settings.getItem('pwa'))?.version
      let latestVersion = `Latest Version: ${pkg.version}`
      // if (installedVersion !== pkg.version) {
        latestVersion = `<a
          href="?clear-cache=${new Date().getTime()}#!/settings"
          title="Click to update to latest version"
        >
        ${latestVersion}
        </a>`
      // }
      let footer = $d.createElement('footer')
      footer.innerHTML = `<hr/>
      <center>
        <sub>Current Version: ${installedVersion}</sub><br/>
        <sub>${latestVersion}</sub>
      </center>`

      let existingFooter = container.querySelector(`footer`)

      if (existingFooter) {
        existingFooter.replaceWith(footer)
      } else {
        container.insertAdjacentElement('beforeend', footer)
      }
    })
}
