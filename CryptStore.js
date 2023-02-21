// Based on https://developer.mozilla.org/en-US/docs/Web/API/SubtleCrypto/encrypt
// Based on https://github.com/plamikcho/local-storage-encrypt

// Encoder based on https://github.com/plamikcho/local-storage-encrypt/blob/master/src/encoder.js

export function bufferToString(ab) {
  let bytes = new Uint8Array(ab);
  let str = new TextDecoder().decode(bytes);

  return str
}

export function stringToBuffer(str) {
  let bytes = new TextEncoder().encode(str);

  return bytes.buffer;
}

/* @type {Uint8ArrayToHex} */
export function toHex(bytes) {
  /** @type {Array<String>} */
  let hex = [];

  bytes.forEach(function (b) {
    let h = b.toString(16);
    h = h.padStart(2, "0");
    hex.push(h);
  });

  return hex.join("");
};

/* @type {HexToUint8Array} */
export function toBytes(hex) {
  let len = hex.length / 2;
  let bytes = new Uint8Array(len);

  let index = 0;
  for (let i = 0; i < hex.length; i += 2) {
    let c = hex.slice(i, i + 2);
    let b = parseInt(c, 16);
    bytes[index] = b;
    index += 1;
  }

  return bytes;
};

export function bufferToHex(buf) {
  let bytes = new Uint8Array(buf)
  let hex = toHex(bytes)
  return hex
}

export function hexToBuffer(hex) {
  let bytes = toBytes(hex)
  return bytes.buffer
}

/**
 * Creates an instance of PbCrypto with encrypt and decrypt operations
 *
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

  async function encrypt(message, iv) {
    if ('string' === typeof iv) {
      iv = hexToBuffer(iv)
    }

    return await deriveKey(password, salt)
      .then(async cryptoKey => await currentCrypto.subtle.encrypt(
        { name, iv },
        cryptoKey,
        stringToBuffer(message)
      ))
      .then(enc => bufferToHex(enc));
  }

  async function decrypt(ciphertext, iv) {
    if ('string' === typeof iv) {
      iv = hexToBuffer(iv)
    }

    return await deriveKey(password, salt)
      .then(async function (cryptoKey) {
        let dec = await currentCrypto.subtle.decrypt(
          { name, iv },
          cryptoKey,
          hexToBuffer(ciphertext)
        )

        return dec
      })
      .then(dec => bufferToString(dec));
  }

  function getInitVector () {
    return currentCrypto.getRandomValues(new Uint8Array(16));
  }

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
 * @param {Encryptage} cryptoWrapper Crypto
 */
export async function getEncryptedStorageFromCrypto(
  storage,
  cryptoWrapper,
  ivKey = null // 'encryptage'
) {
  let isSupported;

  // const getInitVectorKey = key => `${key}_iv`;
  const getInitVectorKey = (key) => `${ivKey || key}_iv`;

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

  await setBrowserSupport();

  if (isSupported && ivKey) {
    // const iv = cryptoWrapper.getInitVector();
    let iv = storage.getItem(getInitVectorKey()) ||
      cryptoWrapper.getInitVector();

    if ('string' !== typeof iv) {
      iv = bufferToHex(iv)
    }

    console.log(
      'isSupported && ivKey',
      iv,
      // stringToBuffer(iv),
      // hexToBuffer(iv),
    )

    storage.setItem(
      getInitVectorKey(),
      iv,
    );
  }

  return {
    ...storage,
    async setItem(key, value) {
      await setBrowserSupport();
      if (isSupported) {
        try {
          const iv = storage.getItem(getInitVectorKey(key)) ||
            cryptoWrapper.getInitVector();
          const encrypted = await cryptoWrapper.encrypt(value, iv);

          storage.setItem(key, String(encrypted));

          if (!ivKey) {
            storage.setItem(
              getInitVectorKey(key),
              bufferToHex(iv),
            );
          }
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
          const decrypted = await cryptoWrapper.decrypt(data, iv);
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

export async function getEncryptedStorageFromPassword(
  storage, password, salt, ivKey
) {
  return await getEncryptedStorageFromCrypto(
    storage,
    encryptMsg(password, salt),
    ivKey,
  );
}

export async function getEncryptedStorage(storage, ...args) {
  const [arg1, arg2, arg3] = args;
  if (typeof arg1 === 'object') { // it is crypto object
    return await getEncryptedStorageFromCrypto(storage, arg1, arg2);
  }
  if (typeof arg1 === 'string' && typeof arg2 === 'string') {
    return await getEncryptedStorageFromPassword(storage, arg1, arg2, arg3);
  }
};
