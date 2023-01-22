// let DashKeys = window.DashKeys;
// import { getEncryptedStorage, } from './node_modules/@plamikcho/pbcrypto/src/index.js';
import { getEncryptedStorage, } from './CryptStore.js';
import { qrSvg, } from './qr.js';
import { toDuff, toDash } from './utils.js'

const STOREAGE_SALT = 'tabasco hardship tricky blimp doctrine'

// @ts-ignore
let dashsight = DashSight.create({
  baseUrl: 'https://dashsight.dashincubator.dev',
});

let rememberMe = JSON.parse(localStorage.getItem('remember'))
let store = rememberMe ? localStorage : sessionStorage
// let passphrase = window.prompt('Enter a passphrase to encrypt your WIF')
let passphrase
let myPrivateKey
let encryptedStore

// encryptedStore.setItem('test', 'Some text to store encrypted')
//   .then(() => encryptedStore.getItem('test'))
//   .then(item => console.log('encryptedStorage getItem', item));
//   // .catch(error => console.log(error));

function resetFormFields() {
  // @ts-ignore
  document.encPrivKey.querySelector('fieldset').disabled = true
  // @ts-ignore
  document.privKeyForm.querySelector('fieldset').disabled = true
  // @ts-ignore
  document.signupCrowdNodeForm.querySelector('fieldset').disabled = true
  // @ts-ignore
  document.acceptCrowdNodeForm.querySelector('fieldset').disabled = true
  // @ts-ignore
  document.depositCrowdNodeForm.querySelectorAll('fieldset')
    .forEach(el => el.disabled = true)
  // @ts-ignore
  document.balanceForm.querySelector('fieldset').disabled = true
}

async function getPrivateKey(wif) {
  let addr

  if (!wif) {
    // @ts-ignore
    wif = await DashKeys.generate();
  }
  encryptedStore.setItem('privateKey', wif)

  try {
    // @ts-ignore
    addr = await DashKeys.wifToAddr(wif);
  } catch (err) {
    console.error('Invalid private key WIF')
  }

  return { wif, addr }
}

async function getBalance(address) {
  // @ts-ignore
  return await CrowdNode.http.GetBalance(
    address
  );
}

function swapStorage(to, from, key) {
  to.setItem(key, from.getItem(key))
  from.removeItem(key)
}

async function checkWalletFunds(addr) {
  // @ts-ignore
  let walletFunds = await dashsight.getInstantBalance(addr)

  console.info('check wallet funds', walletFunds)

  return walletFunds
}

async function fundOrInit(addr) {
  // @ts-ignore
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
    document.getElementById("funding").innerHTML = `
      <h4>Current Balance: Đ${walletFunds.balance}</h4>
      ${dashSvg}
      <figcaption>
        <h3>${addr}</h3>
        <p>You must fund your wallet with at least Đ 0.00236608 to signup and accept terms</p>
      </figcaption>
    `;
  } else if (walletFunds.balance > 0) {
      // @ts-ignore
      let cnStatus = await CrowdNode.status(addr, hotwallet);

      console.log(
        `CrowdNode status for ${addr}`,
        cnStatus,
        walletFunds,
        CrowdNode.offset,
      )
      let msg = `<p>Current Wallet balance for "${
        addr
      }" is Đ${
        walletFunds.balance
      }</p>`

      document.querySelector('p.balance')
        .insertAdjacentHTML('afterbegin', msg)

      // @ts-ignore
      document.depositCrowdNodeForm.amount.max = walletFunds.balance
      // @ts-ignore
      // document.depositCrowdNodeForm.amount.max = toDash(toDuff(walletFunds.balance) - CrowdNode.offset)

      if (!cnStatus || cnStatus?.signup === 0) {
        // @ts-ignore
        document.signupCrowdNodeForm.querySelector('fieldset').disabled = false
      } else if (cnStatus.signup > 0 && cnStatus?.accept === 0) {
        // @ts-ignore
        document.acceptCrowdNodeForm.querySelector('fieldset').disabled = false
      } else {
        // @ts-ignore
        document.depositCrowdNodeForm.querySelectorAll('fieldset')
          .forEach(el => el.disabled = false)
        // @ts-ignore
        document.balanceForm.querySelector('fieldset').disabled = false
      }
  }
}

async function main() {
  // @ts-ignore
  CrowdNode.init({
    // baseUrl: 'https://app.crowdnode.io',
    // insightBaseUrl: 'https://insight.dash.org',
    baseUrl: 'https://dashnode.duckdns.org/api/cors/app.crowdnode.io',
    insightBaseUrl: 'https://insight.dash.org/insight-api',
    dashsocketBaseUrl: 'https://insight.dash.org/socket.io',
    dashsightBaseUrl: 'https://dashsight.dashincubator.dev/insight-api',
  })

  // @ts-ignore
  document.encPrivKey
    .addEventListener('submit', async event => {
      event.preventDefault()

      // @ts-ignore
      passphrase = document.encPrivKey.passphrase?.value

      if (passphrase) {
        // console.log('passphrase', passphrase)
        // @ts-ignore
        document.encPrivKey.passphrase.value = ''

        encryptedStore = getEncryptedStorage(
          store,
          passphrase,
          STOREAGE_SALT
        );

        const privateKeyExists = await encryptedStore.hasItem('privateKey')
        const privateKey = await encryptedStore.getItem('privateKey')

        // @ts-ignore
        document.privKeyForm.querySelector('button').disabled = false

        if (
          !privateKeyExists ||
          (
            privateKey &&
            privateKey !== ''
          )
        ) {
          // @ts-ignore
          myPrivateKey = await getPrivateKey(privateKey)

          // @ts-ignore
          document.privKeyForm.privateKey.value = privateKey

          // @ts-ignore
          document.privKeyForm.querySelector('fieldset').disabled = false

          // @ts-ignore
          document.privKeyForm.querySelector('button').disabled = true
          document.encPrivKey.querySelector('.error').textContent = ''
          document.encPrivKey.querySelector('fieldset').disabled = true

          await fundOrInit(myPrivateKey.addr)
        } else if (privateKeyExists) {
          let errMsg = 'Unable to retrieve private key. Check if your password is correct.'
          console.warn(errMsg)
          document.encPrivKey.querySelector('.error').textContent = `
            ${errMsg}
          `
        }
      }
    })

  // @ts-ignore
  document.privKeyForm
    .addEventListener('input', async event => {
      console.log(
        'change privKeyForm',
        event,
        myPrivateKey?.wif,
        // @ts-ignore
        document.privKeyForm.privateKey.value,
        // @ts-ignore
        myPrivateKey?.wif !== document.privKeyForm.privateKey.value.trim()
      )

      if (event.target.name === 'remember') {
        rememberMe = event.target.checked
        console.log(
          'remember checkbox changed',
          rememberMe
        )

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
          // @ts-ignore
          myPrivateKey?.wif !== document.privKeyForm.privateKey?.value?.trim()
        ) {
          // @ts-ignore
          document.privKeyForm.querySelector('button').disabled = false
        } else {
          // @ts-ignore
          document.privKeyForm.querySelector('button').disabled = true
        }
      }
    })

  // @ts-ignore
  document.privKeyForm
    .addEventListener('submit', async event => {
      event.preventDefault()

      // @ts-ignore
      const privateKey = document.privKeyForm.privateKey?.value?.trim()

      // @ts-ignore
      myPrivateKey = await getPrivateKey(privateKey)

      if (myPrivateKey) {
        resetFormFields()
        // console.log('privKey', myPrivateKey)
        // @ts-ignore
        document.privKeyForm.privateKey.value = myPrivateKey.wif
        // @ts-ignore
        document.privKeyForm.querySelector('button').disabled = true

        await fundOrInit(myPrivateKey.addr)
      }
    })

  // @ts-ignore
  document.signupCrowdNodeForm.addEventListener('submit', async event => {
    event.preventDefault()

    // @ts-ignore
    const { main: { hotwallet }, depositMinimum } = CrowdNode;

    if (myPrivateKey) {
      console.log('privKey', myPrivateKey, [hotwallet, depositMinimum])
      // @ts-ignore
      let cnSignup = await CrowdNode.signup(myPrivateKey.wif, hotwallet);
      console.log('privKey cnSignup', cnSignup)
      // @ts-ignore
      document.signupCrowdNodeForm.querySelector('fieldset').disabled = true
      // @ts-ignore
      document.acceptCrowdNodeForm.querySelector('fieldset').disabled = false
    }
  })

  // @ts-ignore
  document.acceptCrowdNodeForm.addEventListener('submit', async event => {
    event.preventDefault()

    // @ts-ignore
    const { main: { hotwallet }, depositMinimum } = CrowdNode;

    if (myPrivateKey) {
      console.log('privKey', myPrivateKey, [hotwallet, depositMinimum])
      // @ts-ignore
      let cnAccept = await CrowdNode.accept(myPrivateKey.wif, hotwallet);
      console.log('privKey cnAccept', cnAccept)
      // if (!cnAccept || cnAccept.accept === 0) {
      //   // @ts-ignore
      //   document.signupCrowdNodeForm.querySelector('fieldset').disabled = false
      // } else {
        // @ts-ignore
        document.acceptCrowdNodeForm.querySelector('fieldset').disabled = true
        // @ts-ignore
        document.depositCrowdNodeForm.querySelectorAll('fieldset')
          .forEach(el => el.disabled = false)
        // @ts-ignore
        document.balanceForm.querySelector('fieldset').disabled = false
      // }
    }
  })

  // @ts-ignore
  document.depositCrowdNodeForm.addEventListener('submit', async event => {
    event.preventDefault()

    // @ts-ignore
    const amount = document.depositCrowdNodeForm.amount?.value

    // @ts-ignore
    const { main: { hotwallet }, depositMinimum } = CrowdNode;

    console.log(
      'depositCrowdNodeForm amount',
      amount,
      toDuff(amount),
    )

    if (myPrivateKey) {
      const { addr } = myPrivateKey
      // @ts-ignore
      let cnDeposit = await CrowdNode.deposit(
        myPrivateKey.wif,
        hotwallet,
        toDuff(amount) || false
      );

      console.log(
        'privKey cnDeposit',
        cnDeposit
      )

      // @ts-ignore
      // document.balanceForm.submit()
    }
  })

  // @ts-ignore
  document.balanceForm.addEventListener('submit', async event => {
    event.preventDefault()

    if (myPrivateKey) {
      const { addr } = myPrivateKey
      let walletFunds = await checkWalletFunds(addr)
      let balance = await getBalance(addr)

      if (walletFunds) {
        let msg = `<p>Current Wallet balance for "${
          addr
        }" is Đ${
          walletFunds.balance
        }</p>`

        document.querySelector('p.balance')
          .insertAdjacentHTML('afterbegin', msg)
      }

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

        document.querySelector('p.balance')
          .insertAdjacentHTML('beforeend', msg)
        // document.querySelector('p.balance').textContent = msg
      } else {
        console.warn(
          balance.value
        );
      }
    }
  })
}

main()