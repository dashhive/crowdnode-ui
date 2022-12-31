// let DashKeys = window.DashKeys;
// import { getEncryptedStorage, } from './node_modules/@plamikcho/pbcrypto/src/index.js';
import { getEncryptedStorage, } from './CryptStore.js';

const STOREAGE_SALT = 'tabasco hardship tricky blimp doctrine'

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

async function main() {
  // @ts-ignore
  CrowdNode.init({
    baseUrl: 'https://dashnode.duckdns.org/api/cors/app.crowdnode.io',
    insightBaseUrl: 'https://insight.dash.org/insight-api',
    dashsocketBaseUrl: 'https://insight.dash.org/socket.io',
    dashsightBaseUrl: 'https://dashsight.dashincubator.dev/insight-api',
  })

  // @ts-ignore
  console.log('CrowdNode', CrowdNode)

  // @ts-ignore
  document.encPrivKey
    .addEventListener('submit', async event => {
      event.preventDefault()

      // @ts-ignore
      passphrase = document.encPrivKey.passphrase?.value

      if (passphrase) {
        console.log('passphrase', passphrase)
        // @ts-ignore
        document.encPrivKey.passphrase.value = ''

        encryptedStore = getEncryptedStorage(
          store,
          passphrase,
          STOREAGE_SALT
        );

        const privateKey = await encryptedStore.getItem('privateKey')

        // @ts-ignore
        document.privKeyForm.querySelector('button').disabled = false

        // @ts-ignore
        if (privateKey && privateKey !== '') {
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

          // @ts-ignore
          const { hotwallet } = CrowdNode.main;

          // @ts-ignore
          let cnStatus = await CrowdNode.status(myPrivateKey.addr, hotwallet);

          console.log(
            `CrowdNode status for ${myPrivateKey.addr}`,
            cnStatus
          )

          if (!cnStatus) {
            // @ts-ignore
            document.initCrowdNodeForm.querySelector('fieldset').disabled = false
          } else {
            // @ts-ignore
            document.balanceForm.querySelector('fieldset').disabled = false
          }
        } else {
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

        // @ts-ignore
        // if (document.privKeyForm.privateKey?.value?.trim() !== '') {
        //   // @ts-ignore
        //   document.privKeyForm.querySelector('button').disabled = false
        // }
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
        console.log('privKey', myPrivateKey)
        // @ts-ignore
        document.privKeyForm.privateKey.value = myPrivateKey.wif
        // @ts-ignore
        document.privKeyForm.querySelector('button').disabled = true

        // @ts-ignore
        const { hotwallet } = CrowdNode.main;

        // @ts-ignore
        let cnStatus = await CrowdNode.status(myPrivateKey.addr, hotwallet);

        console.log(`CrowdNode status for ${myPrivateKey.addr}`, cnStatus)

        if (!cnStatus) {
          // @ts-ignore
          document.initCrowdNodeForm.querySelector('fieldset').disabled = false
        } else {
          // @ts-ignore
          document.balanceForm.querySelector('fieldset').disabled = false
        }
      }
    })

  // @ts-ignore
  document.initCrowdNodeForm.addEventListener('submit', async event => {
    event.preventDefault()

    // @ts-ignore
    const { main: { hotwallet }, depositMinimum } = CrowdNode;

    if (myPrivateKey) {
      // @ts-ignore
      let cnSignup = await CrowdNode.signup(myPrivateKey.wif, hotwallet);
      // @ts-ignore
      let cnAccept = await CrowdNode.accept(myPrivateKey.wif, hotwallet);
      // @ts-ignore
      let cnDeposit = await CrowdNode.deposit(myPrivateKey.wif, hotwallet, depositMinimum);

      console.log('privKey', myPrivateKey, [cnSignup, cnAccept, cnDeposit])
    }
  })

  // @ts-ignore
  document.balanceForm.addEventListener('submit', async event => {
    event.preventDefault()

    if (myPrivateKey) {
      const { addr } = myPrivateKey
      let balance = await getBalance(addr)

      if (balance?.TotalBalance) {
        let msg = `Current CrowdNode balance for "${
          addr
        }" is Đ${
          balance.TotalBalance
        } with ${
          balance.TotalDividend
        } in dividends.`

        console.info(
          msg,
          balance
        );

        document.querySelector('p.balance').textContent = msg
      } else {
        console.warn(
          balance.value
        );
      }
    }
  })
}

main()