// @ts-nocheck
// let DashKeys = window.DashKeys;
// import { getEncryptedStorage, } from './node_modules/@plamikcho/pbcrypto/src/index.js';
import { getEncryptedStorage, } from './CryptStore.js';
import { qrSvg, } from './qr.js';
import { toDuff, toDash } from './utils.js'

/** @type {document} */
const $d = document;

const STOREAGE_SALT = 'tabasco hardship tricky blimp doctrine'

let dashsight = DashSight.create({
  baseUrl: 'https://dashsight.dashincubator.dev',
});


let Ws = DashSocket;

let rememberMe = JSON.parse(localStorage.getItem('remember'))
let store = rememberMe ? localStorage : sessionStorage
// let passphrase = window.prompt('Enter a passphrase to encrypt your WIF')
let passphrase
let myPrivateKey
let encryptedStore

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

  if (!wif) {

    wif = await DashKeys.generate();
  }
  encryptedStore.setItem('privateKey', wif)

  try {

    addr = await DashKeys.wifToAddr(wif);
  } catch (err) {
    console.error('Invalid private key WIF')
  }

  return { wif, addr }
}

async function getBalance(address) {


  /** @type {CrowdNode} */
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
    let msg = `<p>Current Wallet balance for "${
      addr
    }" is Đ${
      walletFunds.balance
    }</p>`

    $d.querySelector('p.balance')
      .insertAdjacentHTML('afterbegin', msg)
  }

  return walletFunds
}

async function displayCrowdNodeBalance(addr, funds) {
  let balance = funds || await getBalance(addr)

  if (balance?.TotalBalance) {
    let msg = `<p>Current CrowdNode balance for "${
      addr
    }" is Đ${
      balance.TotalBalance
    } with ${
      balance.TotalDividend
    } in dividends.</p>`

    console.info(
      msg,
      balance
    );

    $d.querySelector('p.balance')
      .insertAdjacentHTML('beforeend', msg)
  }

  return balance
}

async function displayBalances(addr, funds, cnBalance) {
  $d.querySelector('p.balance').innerHTML = ''

  const wallet = await displayWalletBalance(addr, funds)
  const balance = await displayCrowdNodeBalance(addr, cnBalance)

  return {
    wallet,
    balance
  }
}

async function fundOrInit(addr) {

  const { hotwallet } = CrowdNode.main;

  let walletFunds = await checkWalletFunds(addr)

  if (walletFunds.balance === 0) {
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
    $d.getElementById("funding").innerHTML = `
      <h4>Current Balance: Đ${walletFunds.balance}</h4>
      ${dashSvg}
      <figcaption>
        <h3>${addr}</h3>
        <p>You must fund your wallet with at least Đ 0.00236608 to signup and accept terms</p>
      </figcaption>
    `

    let walletFunding = await Ws.waitForVout(

      CrowdNode._dashsocketBaseUrl,
      addr,
      0,
    )

    if (walletFunding.satoshis > 0) {
      walletFunds.balance = toDash(walletFunding.satoshis)
      walletFunds.balanceSat = walletFunding.satoshis
    }
  }

  if (walletFunds.balance > 0) {
      $d.getElementById("funding").innerHTML = ''


      let cnStatus = await CrowdNode.status(addr, hotwallet);

      await displayBalances(addr, walletFunds)


      $d.depositCrowdNodeForm.amount.max = walletFunds.balance

      // $d.depositCrowdNodeForm.amount.max = toDash(toDuff(walletFunds.balance) - CrowdNode.offset)

      if (!cnStatus || cnStatus?.signup === 0) {

        $d.signupCrowdNodeForm.querySelector('fieldset').disabled = false
      } else if (cnStatus.signup > 0 && cnStatus?.accept === 0) {

        $d.acceptCrowdNodeForm.querySelector('fieldset').disabled = false
      } else {

        $d.depositCrowdNodeForm.querySelectorAll('fieldset')
          .forEach(el => el.disabled = false)

        $d.balanceForm.querySelector('fieldset').disabled = false
      }
  }
}

async function main() {

  CrowdNode.init({
    // baseUrl: 'https://app.crowdnode.io',
    // insightBaseUrl: 'https://insight.dash.org',
    baseUrl: 'https://dashnode.duckdns.org/api/cors/app.crowdnode.io',
    insightBaseUrl: 'https://insight.dash.org/insight-api',
    dashsocketBaseUrl: 'https://insight.dash.org/socket.io',
    dashsightBaseUrl: 'https://dashsight.dashincubator.dev/insight-api',
  })


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

        const privateKeyExists = await encryptedStore.hasItem('privateKey')
        const privateKey = await encryptedStore.getItem('privateKey')


        $d.privKeyForm.querySelector('button').disabled = false

        if (
          !privateKeyExists ||
          (
            privateKey &&
            privateKey !== ''
          )
        ) {

          myPrivateKey = await getPrivateKey(privateKey)


          $d.privKeyForm.privateKey.value = privateKey || myPrivateKey.wif


          $d.privKeyForm.querySelector('fieldset').disabled = false


          $d.privKeyForm.querySelector('button').disabled = true
          $d.encPrivKey.querySelector('.error').textContent = ''
          $d.encPrivKey.querySelector('fieldset').disabled = true

          await fundOrInit(myPrivateKey.addr)
        } else if (privateKeyExists) {
          let errMsg = 'Unable to retrieve private key. Check if your password is correct.'
          console.warn(errMsg)
          $d.encPrivKey.querySelector('.error').textContent = `
            ${errMsg}
          `
        }
      }
    })


  $d.privKeyForm
    .addEventListener('input', async event => {
      console.log(
        'change privKeyForm',
        event,
        myPrivateKey?.wif,

        $d.privKeyForm.privateKey.value,

        myPrivateKey?.wif !== $d.privKeyForm.privateKey.value.trim()
      )

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
            'privateKey',
          )
          swapStorage(
            localStorage,
            sessionStorage,
            'privateKey_iv',
          )
        } else {
          swapStorage(
            sessionStorage,
            localStorage,
            'privateKey',
          )
          swapStorage(
            sessionStorage,
            localStorage,
            'privateKey_iv',
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


    const { main: { hotwallet }, depositMinimum } = CrowdNode;

    if (myPrivateKey) {
      console.log('privKey', myPrivateKey, [hotwallet, depositMinimum])

      let cnSignup = await CrowdNode.signup(myPrivateKey.wif, hotwallet);
      console.log('privKey cnSignup', cnSignup)

      $d.signupCrowdNodeForm.querySelector('fieldset').disabled = true

      $d.acceptCrowdNodeForm.querySelector('fieldset').disabled = false
    }
  })


  $d.acceptCrowdNodeForm.addEventListener('submit', async event => {
    event.preventDefault()


    const { main: { hotwallet }, depositMinimum } = CrowdNode;

    if (myPrivateKey) {
      console.log('privKey', myPrivateKey, [hotwallet, depositMinimum])

      let cnAccept = await CrowdNode.accept(myPrivateKey.wif, hotwallet);
      console.log('privKey cnAccept', cnAccept)
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


    const { main: { hotwallet }, depositMinimum } = CrowdNode;

    console.log(
      'depositCrowdNodeForm amount',
      amount,
      toDuff(amount),
    )

    if (myPrivateKey) {
      const { addr } = myPrivateKey

      let cnDeposit = await CrowdNode.deposit(
        myPrivateKey.wif,
        hotwallet,
        toDuff(amount) || false
      );

      console.log(
        'privKey cnDeposit',
        cnDeposit
      )

      $d.depositCrowdNodeForm.amount.value = null

      await displayBalances(addr)


      // $d.balanceForm.submit()
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