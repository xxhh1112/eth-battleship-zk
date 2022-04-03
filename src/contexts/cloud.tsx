import React, { useState, useMemo, useEffect, useCallback } from 'react'
import { initializeApp } from 'firebase/app'
import { getFirestore, collection, getDocs, doc, setDoc, Firestore } from 'firebase/firestore/lite'
import { getAuth, signInAnonymously, onAuthStateChanged } from 'firebase/auth'
import { useAsyncEffect } from 'use-async-effect'
import { useGlobal } from '../hooks'
import { GameState, ShipConfig } from '../lib/game'

const firebaseConfig = {
  apiKey: "AIzaSyCPEb5ujsgWNd_7iQQBtymjmptGp9fim9Y",
  authDomain: "zk-battleship.firebaseapp.com",
  projectId: "zk-battleship",
  storageBucket: "zk-battleship.appspot.com",
  messagingSenderId: "926801122471",
  appId: "1:926801122471:web:913a7ffa6fa43e9578b782"
}

const app = initializeApp(firebaseConfig)

export interface CloudContextValue {
  connected: boolean,
  connectError: string,
  addNewGame: (id: any, ships: ShipConfig[]) => Promise<void>,
}

export const CloudContext = React.createContext({} as CloudContextValue);

export const CloudProvider: React.FunctionComponent = ({ children }) => {
  const { genesisBlockHash, account } = useGlobal()
  const [ db, setDb ] = useState<Firestore>()
  const [ connectError, setConnectError ] = useState<string>('')
  const [ connected, setConnected ] = useState<boolean>(false)

  useAsyncEffect(async () => {
    try {
      const auth = getAuth()

      onAuthStateChanged(auth, (user) => {
        if (user) {
          console.log('Firebase user signed-in', user)
          setDb(getFirestore(app))
          setConnected(true)
        } else {
          console.log('Firebase user signed-out')
          setConnected(false)
        }
      })

      await signInAnonymously(auth)
    } catch (err: any) {
      console.error(err)
      setConnectError(`Error connecting to Firestore: ${err.message}`)
    }
  }, [])

  const addNewGame = useCallback(async (id: any, ships: ShipConfig[]) => {
    if (!db) {
      throw new Error('DB not initialised')
    }

    await Promise.all([
      await setDoc(doc(db, 'games', id.toString()), {
        id,
        genesisBlock: genesisBlockHash,
        player1: account,
        status: GameState.NEED_OPPONENT,
        created: Date.now(),
        updated: [],
      })
    ])
  }, [account, db, genesisBlockHash])

  return (
    <CloudContext.Provider value={{
      connectError, 
      connected,
      addNewGame,
    }}>
      {children}
    </CloudContext.Provider>
  )
}

export const CloudConsumer = CloudContext.Consumer