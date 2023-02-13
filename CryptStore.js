// Based on https://developer.mozilla.org/en-US/docs/Web/API/SubtleCrypto/encrypt
// Based on https://github.com/plamikcho/local-storage-encrypt

// Encoder based on https://github.com/plamikcho/local-storage-encrypt/blob/master/src/encoder.js
export function bufferToString(buffer) {
  const bufView = new Uint16Array(buffer);
  const length = bufView.length;
  let result = '';
  let addition = Math.pow(2, 16) - 1;

  for(let i = 0; i < length;i += addition) {
    if (i + addition > length) {
        addition = length - i;
    }
    result += String.fromCharCode.apply(null, bufView.subarray(i, i + addition));
  }
  return result;
}

export function stringToBuffer(str) {
  const ab = new Uint16Array(str.length);
  for (let i = 0; i < str.length; i++) {
      ab[i] = str.charCodeAt(i);
  }
  return ab.buffer;
}

export function buffer8ToString(buf) {
  return String.fromCharCode.call(null, ...new Uint8Array(buf))
}

export function stringToBuffer8(str) {
  let ab = new TextEncoder().encode(str);
  let u8 = new Uint8Array(ab);
  let hex = u8ToHex(u8);
}
  
export function u8ToHex(u8) {
  let hex = [];
  u8.forEach(function (b) {
    let ch = b.toString(16);
    let h = ch.padStart(2, '0');
    hex.push(h);
  });
  return hex.join('\n');
}

/**
 * Creates an instance of PbCrypto with encrypt and decrypt operations
 * @param {String} password
 * @param {String} salt
 * @param {Crypto} currentCrypto - window.crypto instance
 */
export function encryptMsg(
  password, salt, currentCrypto = window.crypto
) {
  const name = 'AES-GCM';
  const targets = ["encrypt", "decrypt"];
  const pbkdfName = 'PBKDF2';
  const hash = { name: 'SHA-256', length: 256 };
  const iterations = 1000;

  const deriveKey = async (password, salt, currentCrypto = window.crypto) => {
    const keyMaterial = await currentCrypto.subtle.importKey(
      "raw",
      stringToBuffer(password),
      { name: pbkdfName },
      false,
      ["deriveBits", "deriveKey"]
    );
    return currentCrypto.subtle.deriveKey(
      {
        name: pbkdfName,
        salt: stringToBuffer(salt),
        iterations,
        hash: hash.name,
      },
      keyMaterial,
      { name, length: hash.length },
      true,
      // @ts-ignore
      targets,
    );
  };

  const encryptMessage = (key, iv, encodedText) => currentCrypto.subtle.encrypt(
    { name, iv },
    key,
    encodedText
  );

  const decryptMessage = (key, iv, ciphertext) => currentCrypto.subtle.decrypt(
    { name, iv },
    key,
    ciphertext
  );

  const encrypt = (message, iv) => deriveKey(password, salt)
    .then(cryptoKey => encryptMessage(cryptoKey, iv, stringToBuffer(message)))
    .then(enc => bufferToString(enc));

  const decrypt = (ciphertext, iv) => deriveKey(password, salt)
    .then(cryptoKey => decryptMessage(cryptoKey, iv, stringToBuffer(ciphertext)))
    .then(dec => bufferToString(dec));

  const getInitVector = () => currentCrypto.getRandomValues(new Uint8Array(16));

  return { encrypt, decrypt, getInitVector }
}

export const isBrowserSupported = async () => {
  const testMessage = 'w?';
  try {
    const cryptoWrapper = encryptMsg('a', 'b');
    const iv = cryptoWrapper.getInitVector();
    const encrypted = await cryptoWrapper.encrypt(testMessage, iv);
    const decrypted = await cryptoWrapper.decrypt(encrypted, iv);
    return decrypted === testMessage;
  } catch (error) {
    console.warn('Your browser does not support WebCrypto API', error);
    return false;
  }
}

/**
 * Gets encrypted storage with async getItem and setItem
 *
 * @param {Storage} storage Browser storage - localStorage, sessionStorage
 * @param {Encrypto} cryptoWrapper Crypto
 */
export function getEncryptedStorageFromCrypto(
  storage, cryptoWrapper
) {

  let isSupported;

  const getInitVectorKey = key => `${key}_iv`;

  const unmodifiedFunctions = {
    clear() {
      storage.clear();
    },
    get length() {
      return storage.length;
    },
    key(i) {
      return storage.key(i);
    },
  };

  const setBrowserSupport = async () => {
    if (typeof isSupported === 'undefined') {
      isSupported = await isBrowserSupported();
    }
  };

  return {
    async setItem(key, value) {
      await setBrowserSupport();
      if (isSupported) {
        try {
          const iv = cryptoWrapper.getInitVector(); // getting iv per item
          const encrypted = await cryptoWrapper.encrypt(value, iv);
          storage.setItem(key, String(encrypted));
          storage.setItem(getInitVectorKey(key), buffer8ToString(iv));
        }
        catch (error) {
          console.error(`Cannot set encrypted value for ${key}. Error: ${error}`);
          throw error;
        }
      } else {
        storage.setItem(key, value); // legacy mode, no encryption
      }
    },
    async getItem(key) {
      await setBrowserSupport();
      if (isSupported) {
        try {
          const data = storage.getItem(key);
          const iv = storage.getItem(getInitVectorKey(key));
          const decrypted = await cryptoWrapper.decrypt(data, stringToBuffer8(iv));
          return decrypted;
        }
        catch (error) {
          console.error(`Cannot get encrypted item for ${key}. Error: ${error}`);
          return null;
        }
      }
      return storage.getItem(key); // legacy mode, no encryption
    },
    async hasItem(key) {
      const data = storage.getItem(key);
      const iv = storage.getItem(getInitVectorKey(key));
      console.log(
        'crypt store has item', key,
        data, iv,
        data !== null && iv !== null
      )
      return data !== null && iv !== null
    },
    removeItem(key) {
      storage.removeItem(key);

      const ivKey = getInitVectorKey(key);
      storage.getItem(ivKey) && storage.removeItem(ivKey);
    },
    ...unmodifiedFunctions,
  };
};

export function getEncryptedStorageFromPassword(
  storage, password, salt
) {
  return getEncryptedStorageFromCrypto(
    storage,
    encryptMsg(password, salt)
  );
}

export function getEncryptedStorage(storage, ...args) {
  const [arg1, arg2] = args;
  console.log('getEncryptedStorage', typeof arg1, typeof arg2)
  if (typeof arg1 === 'object') { // it is crypto object
    return getEncryptedStorageFromCrypto(storage, arg1);
  }
  if (typeof arg1 === 'string' && typeof arg2 === 'string') {
    return getEncryptedStorageFromPassword(storage, arg1, arg2);
  }
};

// (function (_exports) {
//   "use strict";

//   /** @type {any} exports */
//   let exports = _exports;

//   let CryptStore = {};
//   exports.CryptStore = CryptStore;

//   CryptStore.encoder = {}
//   CryptStore.encoder.bufferToString = function BufferToString(){

//   }

//   if ("undefined" !== typeof module) {
//     module.exports = CryptStore;
//   }
// })(("undefined" !== typeof module && module.exports) || window);
