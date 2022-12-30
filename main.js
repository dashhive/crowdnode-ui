// import * as CrowdNode from './node_modules/crowdnode/crowdnode.js'
// import * as CrowdNode from 'crowdnode'
// import { CrowdNode } from "crowdnode";

// let DashKeys = window.DashKeys;

let myPrivateKey

// @ts-ignore
CrowdNode.init({
  baseUrl: 'https://dashnode.duckdns.org/api/cors/app.crowdnode.io',
  insightBaseUrl: 'https://insight.dash.org/insight-api',
  dashsocketBaseUrl: 'https://insight.dash.org/socket.io',
  dashsightBaseUrl: 'https://dashsight.dashincubator.dev/insight-api',
})

async function getPrivateKey(wif) {
  // Dash Core Lib Implementation
  // @ts-ignore
  // const { PrivateKey } = dashcore;
  // const key = new PrivateKey();
  // const address = key.toAddress().toString();
  // // const WIF = key.toWIF().trim();

  let addr

  if (!wif) {
    wif = await DashKeys.generate();
  }
  // ex: "XEez2HcUhEomZoxzgH7H3LxnRAkqF4kRCVE8mW9q4YSUV4yuADec"
  
  try {
    addr = await DashKeys.wifToAddr(wif);
  } catch (err) {
    console.error('Invalid private key WIF')
  }
  // ex: "Xjn9fksLacciynroVhMLKGXMqMJtzJNLvQ"

  return { wif, addr }
}

async function getBalance(address) {
  // @ts-ignore
  return await CrowdNode.http.GetBalance(
    address
  );
}

// @ts-ignore
console.log('CrowdNode', CrowdNode)

// @ts-ignore
document.privKeyForm
  .addEventListener('input', async event => {
    console.log('change privKeyForm', event)
    // @ts-ignore
    document.privKeyForm.querySelector('button').disabled = false
  })
document.privKeyForm
  .addEventListener('submit', async event => {
    event.preventDefault()
    // event.stopPropagation()
    const privateKey = event.target.privateKey?.value

    myPrivateKey = window.myPrivateKey = await getPrivateKey(privateKey)

    if (myPrivateKey) {
      console.log('privKey', myPrivateKey)
      // @ts-ignore
      document.privKeyForm.querySelector('button').disabled = true
      // @ts-ignore
      document.initCrowdNodeForm.querySelector('button').disabled = false
      // @ts-ignore
      document.balanceForm.querySelector('button').disabled = false
    }
  })

// @ts-ignore
document.initCrowdNodeForm.addEventListener('submit', async event => {
  event.preventDefault()
  // event.stopPropagation()
  
  // const privKey = getPrivateKey()
  // @ts-ignore
  const { hotwallet } = CrowdNode.main;

  if (myPrivateKey) {
    // @ts-ignore
    let cnSignup = await CrowdNode.signup(myPrivateKey.wif, hotwallet);
    // @ts-ignore
    let cnAccept = await CrowdNode.accept(myPrivateKey.wif, hotwallet);

    console.log('privKey', myPrivateKey, cnSignup, cnAccept)
  }
})

// @ts-ignore
document.balanceForm.addEventListener('submit', async event => {
  event.preventDefault()
  // event.stopPropagation()

  // const addr = event.target.address?.value

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
