import { getEncryptedStorage, } from './CryptStore.js';
import { qrSvg, } from './qr.js';
import { toDuff, toDash } from './utils.js'
import {
  DashKeys,
  DashSight,
  DashSocket,
  DashApi,
  CrowdNode
} from './imports.js'

/** @type {document} */
const $d = document;

// @ts-ignore
let dashsight = DashSight.create({
  baseUrl: 'https://dashsight.dashincubator.dev',
});

// let Ws = DashSocket;

let rememberMe = JSON.parse(localStorage.getItem('remember'))
let store = rememberMe ? localStorage : sessionStorage
// let passphrase = window.prompt('Enter a passphrase to encrypt your WIF')
let passphrase
let myPrivateKey
let encryptedStore

const STOREAGE_SALT = 'tabasco hardship tricky blimp doctrine'
const PK = 'privateKey'
const PKIV = 'privateKey_iv'

const { hotwallet } = CrowdNode.main;
const { depositMinimum, stakeMinimum } = CrowdNode
const { signupForApi, acceptTerms, offset } = CrowdNode.requests;
let feeEstimate = 500;
let signupOnly = signupForApi + offset;
let acceptOnly = acceptTerms + offset;
let signupFees = signupOnly + acceptOnly;
let signupTotal = signupFees + 2 * feeEstimate;

function resetFormFields() {
  $d.encPrivKey.querySelector('fieldset').disabled = true
  $d.privKeyForm.querySelector('fieldset').disabled = true
  $d.signupCrowdNodeForm.querySelector('fieldset').disabled = true
  $d.acceptCrowdNodeForm.querySelector('fieldset').disabled = true
  $d.depositCrowdNodeForm.querySelectorAll('fieldset')
    .forEach(el => el.disabled = true)
  $d.balanceForm.querySelector('fieldset').disabled = true
}

async function getPrivateKey(wif) {
  let addr

  console.warn(
    '======getPrivateKey======',
    {
      wif,
      passphrase,
      pkiv: store.getItem(PKIV),
      ppkiv: !passphrase && !!store.getItem(PKIV)
    }
  )

  if (!passphrase && !!store.getItem(PKIV)) {
    return null
  }

  if (!wif) {
    wif = await DashKeys.generate();
  }

  if (passphrase) {
    encryptedStore.setItem(PK, wif)
  } else {
    store.setItem(PK, wif)
  }

  try {
    addr = await DashKeys.wifToAddr(wif);
  } catch (err) {
    console.error('Invalid private key WIF')
  }

  return { wif, addr }
}

async function getBalance(address) {
  return await CrowdNode.http.GetBalance(
    address
  );
}

function swapStorage(to, from, key) {
  to.setItem(key, from.getItem(key))
  from.removeItem(key)
}

async function checkWalletFunds(addr) {
  let walletFunds = await dashsight.getInstantBalance(addr)

  console.info('check wallet funds', walletFunds)

  return walletFunds
}

async function displayWalletBalance(addr, funds) {
  let walletFunds = funds || await checkWalletFunds(addr)

  if (walletFunds) {
    // let msg = `<p>Current Wallet balance for "${
    //   addr
    // }" is Đ${
    //   walletFunds.balance
    // }</p>`
    // let msg = `<p>Đash Wallet balance: Đ ${
    //   walletFunds.balance
    // }</p>`
    let msg = `<span>Đ ${ walletFunds.balance }</span>`

    $d.querySelector('header .dash-status .balance')
      // .innerHTML = msg
      .insertAdjacentHTML('beforeend', msg)
  }

  return walletFunds
}

async function displayCrowdNodeBalance(addr, funds) {
  let balance = funds || await getBalance(addr)

  if (balance?.TotalBalance) {
    // let msg = `<p>Current CrowdNode balance for "${
    //   addr
    // }" is Đ${
    //   balance.TotalBalance
    // } with ${
    //   balance.TotalDividend
    // } in dividends.</p>`
    // let msg = `
    //   <p>
    //     CrowdNode balance: Đ ${
    //       balance.TotalBalance
    //     }
    //   </p>
    //   <p>
    //     CrowdNode dividends: Đ ${
    //       balance.TotalDividend
    //     }
    //   </p>
    // `

    console.info(
      // msg,
      balance
    );

    // $d.querySelector('p.balance')
    //   .insertAdjacentHTML('beforeend', msg)
    $d.querySelector('header .cn-status .balance')
      // .innerHTML = `Đ ${ balance.TotalBalance }`
      .insertAdjacentHTML('beforeend', `<span>Đ ${ balance.TotalBalance }</span>`)
    $d.querySelector('header .cn-status .dividends')
      // .innerHTML = `Đ ${ balance.TotalDividend }`
      .insertAdjacentHTML('beforeend', `<span>Đ ${ balance.TotalDividend }</span>`)
  }

  return balance
}

async function displayBalances(addr, funds, cnBalance) {
  // $d.querySelector('p.balance').innerHTML = ''
  let bd = $d.querySelectorAll('header .balance, header .dividends')
    // .forEach(el => el.querySelector('> div').innerHTML = 'Đ 0')
    .forEach(el => el.querySelector('span')?.remove())

  console.log('displayBalances & dividends', bd)

  const wallet = await displayWalletBalance(addr, funds)
  const balance = await displayCrowdNodeBalance(addr, cnBalance)

  return {
    wallet,
    balance
  }
}

/**
 * `requestFundsQR` returns a string to be used in HTML that displays
 * a QR Code in SVG format with text description including optional
 * `msg` appended
 *
 * @param {string} addr
 * @param {import('dashsight').InstantBalance} currentFunds
 * @param {number} fundsNeeded - in satoshis
 * @param {string} [msg]
 * @returns {string}
 */
function requestFundsQR(addr, currentFunds, fundsNeeded, msg = '') {
  let dashSvg = qrSvg(
    `dash://${addr}`,
    {
      background: '#fff0',
      color: '#000',
      indent: 1,
      padding: 1,
      size: 'mini',
      container: 'svg-viewbox',
      join: true,
    }
  )

  let fundingDiff = `<p>
    You must deposit at least <strong>Đ ${toDash(fundsNeeded)}</strong> ${msg}
  </p>`

  if (currentFunds.balanceSat > 0) {
    fundingDiff = `
      <p>You have <strong>Đ ${toDash(currentFunds.balanceSat)}</strong> in your wallet. This step requires <strong>Đ ${toDash(fundsNeeded)}</strong>.</p>
      <p>You must deposit at least <strong>Đ ${toDash(fundsNeeded - currentFunds.balanceSat)}</strong> more Dash ${msg}</p>
    `
  }

  return `
    <dialog id="fundingModal">
      <progress class="pending"></progress>
      <form method="dialog">
        <h4>Current Wallet Balance: Đ ${currentFunds.balance}</h4>
        ${dashSvg}
        <figcaption>
          <h3>${addr}</h3>
          ${fundingDiff}
        </figcaption>
        <button value="cancel">Close</button>
      </form>
    </dialog>
  `
}

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
async function hasOrRequestFunds(addr, requiredFunds, msg, callback = () => {}) {
  let walletFunding
  let walletFunds = await checkWalletFunds(addr)
  let fundsNeeded = walletFunds.balanceSat < requiredFunds

  console.log('hasOrRequestFunds', walletFunds.balanceSat, requiredFunds, fundsNeeded)

  if (fundsNeeded) {
    $d.getElementById("funding").innerHTML = requestFundsQR(
      addr,
      walletFunds,
      requiredFunds,
      msg
    )

    $d.getElementById("fundingModal").showModal();

    // @ts-ignore
    walletFunding = await DashSocket.waitForVout(
      CrowdNode._dashsocketBaseUrl,
      addr,
      0,
    )

    if (walletFunding.satoshis < requiredFunds) {
      await hasOrRequestFunds(addr, requiredFunds, msg)
    }
  }

  return {
    walletFunds,
    fundsNeeded
  }
}

async function fundOrInit(addr) {
  let walletFunds = await checkWalletFunds(addr)

  if (walletFunds.balance === 0) {
    $d.getElementById("funding").innerHTML = requestFundsQR(
      addr,
      walletFunds,
      // 0.00236608,
      signupFees,
      'to signup and accept CrowdNode terms'
    )

    $d.getElementById("fundingModal").showModal();

    // $d.querySelector("#fundingModal").insertAdjacentHTML(
    //   'afterbegin',
    //   `<progress class="pending"></progress>`,
    //   // `<div class="loader"></div>`,
    // )

    // @ts-ignore
    let walletFunding = await DashSocket.waitForVout(
      CrowdNode._dashsocketBaseUrl,
      addr,
      0,
    )

    if (walletFunding.satoshis > 0) {
      /** @type {HTMLDialogElement} */
      $d.getElementById("fundingModal").close()
      walletFunds.balance = parseFloat(toDash(walletFunding.satoshis))
      walletFunds.balanceSat = walletFunding.satoshis
    }
  }

  if (walletFunds.balance > 0) {
      $d.getElementById("funding").innerHTML = ''

      let cnStatus = await CrowdNode.status(addr, hotwallet);

      await displayBalances(addr, walletFunds)

      $d.depositCrowdNodeForm.amount.min = toDash(depositMinimum + feeEstimate)
      // $d.depositCrowdNodeForm.amount.max = walletFunds.balance.toString()

      // $d.depositCrowdNodeForm.amount.max = toDash(toDuff(walletFunds.balance) - CrowdNode.offset)

      if (!cnStatus || cnStatus?.signup === 0) {
        await hasOrRequestFunds(
          myPrivateKey.addr,
          signupOnly + feeEstimate,
          'to signup for CrowdNode'
        )

        $d.signupCrowdNodeForm.querySelector('fieldset').disabled = false
      } else if (cnStatus.signup > 0 && cnStatus.accept === 0) {
        await hasOrRequestFunds(
          myPrivateKey.addr,
          acceptOnly + feeEstimate,
          'to accept terms of service for CrowdNode'
        )

        $d.acceptCrowdNodeForm.querySelector('fieldset').disabled = false
      } else {
        $d.depositCrowdNodeForm.querySelectorAll('fieldset')
          .forEach(el => el.disabled = false)

        $d.balanceForm.querySelector('fieldset').disabled = false
      }
  }
}

async function loadKey(
  privateKey,
  // passphrase,
) {
  // if (
  //   // !privateKeyExists ||
  //   (
  //     privateKey &&
  //     privateKey !== ''
  //   )
  // ) {
  myPrivateKey = await getPrivateKey(privateKey)

  if (myPrivateKey === null) {
    // decrypt your key
    console.warn('your private key is encrypted', myPrivateKey)
    $d.encPrivKey.querySelector('fieldset').disabled = false
    $d.privKeyForm.querySelector('fieldset').disabled = true
    return null
  }

  $d.privKeyForm.privateKey.value = privateKey || myPrivateKey.wif

  $d.privKeyForm.querySelector('fieldset').disabled = false

  $d.privKeyForm.querySelector('button').disabled = true
  $d.encPrivKey.querySelector('.error').textContent = ''
  $d.encPrivKey.querySelector('fieldset').disabled = true

  if (!passphrase) {
    $d.encPrivKey.querySelector('fieldset').disabled = false
  }

  await fundOrInit(myPrivateKey.addr)
  // }
  // else if (privateKeyExists) {
  //   let errMsg = 'Unable to retrieve private key. Check if your password is correct.'
  //   console.warn(errMsg)
  //   $d.encPrivKey.querySelector('.error').textContent = `
  //     ${errMsg}
  //   `
  // }
}

export default async function main() {
  CrowdNode.init({
    // baseUrl: 'https://app.crowdnode.io',
    // insightBaseUrl: 'https://insight.dash.org',
    baseUrl: 'https://dashnode.duckdns.org/api/cors/app.crowdnode.io',
    insightBaseUrl: 'https://insight.dash.org/insight-api',
    dashsocketBaseUrl: 'https://insight.dash.org/socket.io',
    dashsightBaseUrl: 'https://dashsight.dashincubator.dev/insight-api',
  })
  let _privateKey

  if (passphrase) {
    encryptedStore = getEncryptedStorage(
      store,
      passphrase,
      STOREAGE_SALT
    );
    _privateKey = await encryptedStore.getItem(PK)
  } else {
    _privateKey = await store.getItem(PK)
  }

  loadKey(_privateKey)

  console.log('un/encrypted private keys', _privateKey)

  $d.encPrivKey
    .addEventListener('submit', async event => {
      event.preventDefault()

      passphrase = $d.encPrivKey.passphrase?.value

      if (passphrase) {
        // console.log('passphrase', passphrase)

        $d.encPrivKey.passphrase.value = ''

        encryptedStore = getEncryptedStorage(
          store,
          passphrase,
          STOREAGE_SALT
        );

        const privateKeyExists = await encryptedStore.hasItem(PK)
        const privateKey = await encryptedStore.getItem(PK)

        console.log('encPrivKey form myPrivateKey', {
          myPrivateKey,
          privateKeyExists,
          privateKey
        })

        $d.privKeyForm.querySelector('button').disabled = false

        loadKey(myPrivateKey?.wif || privateKey)
      }
    })



  $d.privKeyForm
    .addEventListener('input', async (
      /** @type {Event & { target: HTMLInputElement}} event */
      event
      ) => {
      console.log(
        'change privKeyForm',
        event,
        myPrivateKey?.wif,

        $d.privKeyForm.privateKey.value,

        myPrivateKey?.wif !== $d.privKeyForm.privateKey.value.trim()
      )

      // let target = event.target

      if (event.target.name === 'remember') {
        rememberMe = event.target.checked

        localStorage.setItem(
          'remember',
          rememberMe
        )

        if (rememberMe) {
          swapStorage(
            localStorage,
            sessionStorage,
            PK,
          )
          swapStorage(
            localStorage,
            sessionStorage,
            PKIV,
          )
        } else {
          swapStorage(
            sessionStorage,
            localStorage,
            PK,
          )
          swapStorage(
            sessionStorage,
            localStorage,
            PKIV,
          )
        }

        store = rememberMe ? localStorage : sessionStorage

        encryptedStore = getEncryptedStorage(
          store,
          passphrase,
          STOREAGE_SALT
        );
      } else {
        if (

          myPrivateKey?.wif !== $d.privKeyForm.privateKey?.value?.trim()
        ) {

          $d.privKeyForm.querySelector('button').disabled = false
        } else {

          $d.privKeyForm.querySelector('button').disabled = true
        }
      }
    })


  $d.privKeyForm
    .addEventListener('submit', async event => {
      event.preventDefault()

      const privateKey = $d.privKeyForm.privateKey?.value?.trim()

      myPrivateKey = await getPrivateKey(privateKey)

      if (myPrivateKey) {
        resetFormFields()
        // console.log('privKey', myPrivateKey)

        $d.privKeyForm.privateKey.value = myPrivateKey.wif

        $d.privKeyForm.querySelector('button').disabled = true

        await fundOrInit(myPrivateKey.addr)
      }
    })


  $d.signupCrowdNodeForm.addEventListener('submit', async event => {
    event.preventDefault()

    if (myPrivateKey) {
      await hasOrRequestFunds(
        myPrivateKey.addr,
        signupOnly + feeEstimate,
        'to signup for CrowdNode'
      )

      // console.log('privKey', myPrivateKey, hotwallet)

      $d.body.insertAdjacentHTML(
        'afterbegin',
        `<progress id="pageLoader" class="pending"></progress>`,
      )

      let cnSignup = await CrowdNode.signup(myPrivateKey.wif, hotwallet);
      console.log('signupCrowdNodeForm', cnSignup)

      $d.getElementById('pageLoader').remove()

      // if ()

      $d.signupCrowdNodeForm.querySelector('fieldset').disabled = true

      $d.acceptCrowdNodeForm.querySelector('fieldset').disabled = false
    }
  })


  $d.acceptCrowdNodeForm.addEventListener('submit', async event => {
    event.preventDefault()

    if (myPrivateKey) {
      await hasOrRequestFunds(
        myPrivateKey.addr,
        acceptOnly + feeEstimate,
        'to accept terms of service for CrowdNode'
      )

      // console.log('privKey', myPrivateKey, hotwallet)

      $d.body.insertAdjacentHTML(
        'afterbegin',
        `<progress id="pageLoader" class="pending"></progress>`,
      )

      let cnAccept = await CrowdNode.accept(myPrivateKey.wif, hotwallet);
      console.log('acceptCrowdNodeForm', cnAccept)

      $d.getElementById('pageLoader').remove()

      // if (!cnAccept || cnAccept.accept === 0) {
      //
      //   $d.signupCrowdNodeForm.querySelector('fieldset').disabled = false
      // } else {

        $d.acceptCrowdNodeForm.querySelector('fieldset').disabled = true

        $d.depositCrowdNodeForm.querySelectorAll('fieldset')
          .forEach(el => el.disabled = false)

        $d.balanceForm.querySelector('fieldset').disabled = false
      // }
    }
  })


  $d.depositCrowdNodeForm.addEventListener('submit', async event => {
    event.preventDefault()

    const amount = $d.depositCrowdNodeForm.amount?.value

    console.log(
      'depositCrowdNodeForm amount',
      amount,
      toDuff(amount),
    )

    if (myPrivateKey) {
      await hasOrRequestFunds(
        myPrivateKey.addr,
        depositMinimum + feeEstimate,
        ''
      )

      const { addr } = myPrivateKey

      $d.getElementById('pageLoader')?.remove()

      $d.body.insertAdjacentHTML(
        'afterbegin',
        `<progress id="pageLoader" class="pending"></progress>`,
      )

      try {
        let cnDeposit = await CrowdNode.deposit(
          myPrivateKey.wif,
          hotwallet,
          toDuff(amount) || null
        );

        console.log(
          'depositCrowdNodeForm deposit res',
          cnDeposit
        )

        $d.depositCrowdNodeForm.amount.value = null

        await displayBalances(addr)
      } catch(err) {
        console.warn('failed to deposit', err)
      }

      $d.getElementById('pageLoader').remove()
    }
  })


  $d.balanceForm.addEventListener('submit', async event => {
    event.preventDefault()

    if (myPrivateKey) {
      const { addr } = myPrivateKey

      const { balance } = await displayBalances(addr)

      if (!balance?.TotalBalance) {
        console.warn(
          balance.value
        );
      }
    }
  })
}

main()