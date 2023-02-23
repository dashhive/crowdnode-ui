import { toDash } from '../utils.js'
import {
  DashSocket,
  DashSight,
  CrowdNode,
} from '../imports.js'
import {
  storeKeys,
  getStoredKeys,
  swapStorage,
} from '../lib/storage.js'

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
let signupTotal = signupFees + 2 * feeEstimate;

/**
 * `requestFundsQR` returns a string to be used in HTML that displays
 * a QR Code in SVG format with text description including optional
 * `msg` appended
 *
 * @param {string} addr
 * @param {import('dashsight').InstantBalance} currentFunds
 * @param {number} fundsNeeded - in satoshis
 * @param {string} [msg]
 * @returns {HTMLDialogElement | HTMLElement}
 */
export function requestFundsQR(addr, currentFunds, fundsNeeded, msg = '') {
  let fundingModal = $d.createElement('qr-dialog');
  fundingModal.setAttribute('addr', addr);
  fundingModal.setAttribute('funds', JSON.stringify(currentFunds));
  fundingModal.setAttribute('needed', fundsNeeded.toString());
  fundingModal.setAttribute('msg', msg);

  // fundingModal = `
  //   <qr-dialog
  //     addr="${addr}"
  //     currentFunds="${JSON.stringify(walletFunds)}"
  //     fundsNeeded="${fundsAndFees}"
  //     msg="${msg}"
  //   />
  // `

  return fundingModal
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
    let fundingModal = requestFundsQR(
      addr,
      walletFunds,
      fundsAndFees,
      msg
    )

    console.log('hasOrRequestFunds fundingModal', fundingModal)

    $d.querySelector("main")
      .insertAdjacentElement('afterend', fundingModal)

    // fundingModal?.show();
    fundingModal?.showModal();
    fundingModal?.on('close', async (e) => {
      console.log('hasOrRequestFunds fundingModal close event', e)
      let storedKeys = await getStoredKeys()
      let addrRows = await getAddrRows(storedKeys)

      console.info('withdrawModal WALLET ROWS', storedKeys, addrRows)

      $d.querySelector('#addressList tbody').innerHTML = addrRows
    })

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
    'hasOrRequestFunds',
    walletFunds.balanceSat,
  )

  let fundingModal = requestFundsQR(
    addr,
    walletFunds,
    fees,
    msg
  )

  console.log('hasOrRequestFunds fundingModal', fundingModal)

  $d.querySelector("main")
    .insertAdjacentElement('afterend', fundingModal)

  // fundingModal?.show();
  fundingModal?.showModal();
  fundingModal?.on('close', async (e) => {
    console.log('hasOrRequestFunds fundingModal close event', e)
    let storedKeys = await getStoredKeys()
    let addrRows = await getAddrRows(storedKeys)

    console.info('withdrawModal WALLET ROWS', storedKeys, addrRows)

    $d.querySelector('#addressList tbody').innerHTML = addrRows
  })

  // @ts-ignore
  walletFunding = await DashSocket.waitForVout(
    CrowdNode._dashsocketBaseUrl,
    addr,
    0,
  )

  // if (walletFunding.satoshis < fees) {
  //   await hasOrRequestFunds(addr, fees, msg)
  // }

  if (walletFunding.satoshis > 0) {
    fundingModal?.close()
    walletFunds.balance = parseFloat(toDash(walletFunding.satoshis))
    walletFunds.balanceSat = walletFunding.satoshis
  }

  return {
    walletFunds
  }
}

export function requestWithdraw(name, from) {
  let withdrawModal = $d.createElement('withdraw-dialog');
  withdrawModal.setAttribute('name', name);
  withdrawModal.setAttribute('from', from);
  // let withdrawModalTemplate = $d.createElement('template')
  // withdrawModalTemplate.innerHTML = `<withdraw-dialog
  //   name="${name}"
  //   fromAddr="${fromAddr}"
  // />`
  // let withdrawModal = withdrawModalTemplate.content.querySelector('withdraw-dialog')

  console.log('withdraw button modal', withdrawModal)

  $d.querySelector("main")
    .insertAdjacentElement('afterend', withdrawModal)

  return withdrawModal
}

export function copyToClipboard(event) {
  event.preventDefault()
  // let copyText = document.querySelector(sel);
  event.target.previousElementSibling.select();
  document.execCommand("copy");
}

export async function checkWalletFunds(addr) {
  let walletFunds = await dashsight.getInstantBalance(addr)

  console.info('check wallet funds', walletFunds)

  return walletFunds
}

export async function getBalance(address) {
  return await CrowdNode.http.GetBalance(
    address
  );
}

export async function fundOrInit(addr) {
  let walletFunds = await checkWalletFunds(addr)

  if (walletFunds.balance === 0) {
    fundingModal = requestFundsQR(
      addr,
      walletFunds,
      // 0.00236608,
      signupFees,
      'to signup and accept CrowdNode terms'
    )

    console.log('fundOrInit fundingModal', fundingModal)

    $d.querySelector("main")
      .insertAdjacentElement('afterend', fundingModal)

    // fundingModal = /** @type {HTMLDialogElement} */ (
    //   $d.getElementById("fundingModal")
    // )

    // fundingModal?.show();
    fundingModal?.showModal();

    fundingModal?.on('close', async (e) => {
      console.log('hasOrRequestFunds fundingModal close event', e)
      let storedKeys = await getStoredKeys()
      let addrRows = await getAddrRows(storedKeys)

      console.info('withdrawModal WALLET ROWS', storedKeys, addrRows)

      $d.querySelector('#addressList tbody').innerHTML = addrRows
    })

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

      // fundingModal = /** @type {HTMLDialogElement} */ (
      //   $d.getElementById("fundingModal")
      // )
      fundingModal?.close()
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
        // myKeys.forEach(myPrivateKey => {

        // })
        // await hasOrRequestFunds(
        //   myKeys?.addrs[selectedPrivateKey],
        //   signupOnly + feeEstimate,
        //   'to signup for CrowdNode'
        // )

        $d.signupCrowdNodeForm.querySelector('fieldset').disabled = false
      } else if (cnStatus.signup > 0 && cnStatus.accept === 0) {
        // await hasOrRequestFunds(
        //   myKeys?.addrs[selectedPrivateKey],
        //   acceptOnly + feeEstimate,
        //   'to accept terms of service for CrowdNode'
        // )

        $d.acceptCrowdNodeForm.querySelector('fieldset').disabled = false
      } else {
        $d.depositCrowdNodeForm.querySelectorAll('fieldset')
          .forEach(el => el.disabled = false)

        $d.balanceForm.querySelector('fieldset').disabled = false
      }
  }
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
 * `getPublicKeysFromWIFS` returns an object with
 * WIF Private key as the Object keys and
 * Dash Public Addresses as values
 *
 * @param {string[]} wifs
 * @returns {Promise<Object>}
 */
export async function getPublicKeysFromWIFS(wifs) {
  let newPrivateKey

  console.warn(
    '======getPublicKeysFromWIFS======',
    {
      wifs,
      // passphrase,
      pkiv: store.getItem(PKIV),
      ppkiv: !passphrase && !!store.getItem(PKIV),
    }
  )

  if (!passphrase && !!JSON.parse(store.getItem(PKIV))) {
    return null
  }

  if (!wifs || wifs?.length === 0) {
    newPrivateKey = await DashKeys.utils.generateWifNonHd()
    wifs = [newPrivateKey]
    selectedPrivateKey = newPrivateKey
  }

  // let addrs = Object.fromEntries(
  //   Array.from(wifs, w => [w, undefined])
  // )
  let addrs = {}

  // for(let wif of wifs) {
  for(let i=0; i < wifs.length; i++) {
    let wif = wifs[i]
    let wifPK

    if (!wif || wif === '') {
      newPrivateKey = await DashKeys.utils.generateWifNonHd()
      wif = newPrivateKey
      wifs[i] = newPrivateKey
    }

    try {
      wifPK = await wifToPrivateKey(wif)
      console.log('wifPK', wif, wifPK)
    } catch (err) {
      console.error('wifToPrivateKey Invalid private key WIF', wif)
    }

    if (wifPK) {
      try {
        selectedPrivateKey = selectedPrivateKey || wif
        addrs[wif] = await DashKeys.wifToAddr(wif);
      } catch (err) {
        console.error('Invalid private key WIF', wif)
      }
    }
  }

  if (passphrase) {
    encryptedStore.setItem(PK, JSON.stringify(wifs))
    encryptedStore.setItem(SK, selectedPrivateKey)
  } else {
    store.setItem(PK, JSON.stringify(wifs))
    store.setItem(SK, selectedPrivateKey)
  }

  console.log('wifs & pub addrs', addrs)

  return { newPrivateKey, addrs }
}

export async function loadKeys(
  privateKeys,
) {
  myKeys = await getPublicKeysFromWIFS([...new Set([
    ..._privateKeys,
    ...privateKeys
  ])])
  selectedPrivateKey = myKeys?.newPrivateKey || selectedPrivateKey

  if (myKeys === null) {
    console.warn('your private keys are encrypted', myKeys)
    $d.encPrivKey.querySelector('fieldset').disabled = false
    $d.privKeyForm.querySelector('fieldset').disabled = true
    return null
  }

  $d.privKeyForm.privateKey.value =
    privateKeys[selectedPrivateKey] ||
    privateKeys[Object.keys(privateKeys)[0]] ||
    selectedPrivateKey

  $d.privKeyForm.querySelector('fieldset').disabled = false

  $d.privKeyForm.querySelector('button').disabled = true
  $d.encPrivKey.querySelector('.error').textContent = ''
  $d.encPrivKey.querySelector('fieldset').disabled = true

  if (!passphrase) {
    $d.encPrivKey.querySelector('fieldset').disabled = false
  }

  console.warn('myKeys?.addrs[selectedPrivateKey]', myKeys, selectedPrivateKey, myKeys?.addrs[selectedPrivateKey])
  await fundOrInit(myKeys?.addrs[selectedPrivateKey])
  // }
  // else if (privateKeyExists) {
  //   let errMsg = 'Unable to retrieve private key. Check if your password is correct.'
  //   console.warn(errMsg)
  //   $d.encPrivKey.querySelector('.error').textContent = `
  //     ${errMsg}
  //   `
  // }
}

export async function getAddrRows(keys) {
  let rows = []

  for (let [pub, priv] of keys) {
    displayAddressBalance(pub)
      .then(b => {
        $d.getElementById(`da_${pub}`).innerHTML = b
      })
    displayCNAddrBalance(pub)
      .then(b => {
        $d.getElementById(`cn_${pub}`).innerHTML = b
      })

    rows.push(`
      <tr>
        <td>
          <strong>${pub}</strong><br/>
          <em>${priv}</em>
        </td>
        <td id="deposit_${pub}">
          <deposit-form
            name="${pub}DepositForm"
            address="${pub}"
          />
        </td>
        <td id="da_${pub}"></td>
        <td id="withdraw_${pub}">
          <withdraw-form
            name="${pub}WithdrawForm"
            from="${pub}"
          />
        </td>
        <td id="cn_${pub}"></td>
      </tr>
    `)
  }

  return rows.join('\n')
}