import React, { useState, useEffect, useRef } from 'react';

function App() {
  // States: home, briefing, step1, step2, step3, step4, final, victory
  const [step, setStep] = useState('home');
  const [code, setCode] = useState('');
  const [fragments, setFragments] = useState([]); // Track fragments won
  const [lastNfc, setLastNfc] = useState(null);
  const [isSimulating, setIsSimulating] = useState(false);
  
  const stepRef = useRef(step);
  useEffect(() => {
    stepRef.current = step;
  }, [step]);

  const handleNfcDetection = (data) => {
    if (stepRef.current !== 'step2') return;
    console.log('NFC detected for Step 2:', data.uid);
    setLastNfc(data);
  };

  const triggerSimulation = () => {
    if (isSimulating || stepRef.current !== 'step2') return;
    setIsSimulating(true);
    const simData = { 
      uid: 'SIM-' + Math.random().toString(36).substr(2, 9).toUpperCase(), 
      timestamp: new Date().toLocaleTimeString() 
    };
    handleNfcDetection(simData);
    fetch('/api/simulate-nfc', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ uid: simData.uid })
    }).catch(() => {});
    setTimeout(() => setIsSimulating(false), 2000);
  };

  useEffect(() => {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const host = window.location.host;
    const wsUrl = `${protocol}//${host}/ws/nfc`;
    
    const connect = () => {
      ws.current = new WebSocket(wsUrl);
      ws.current.onmessage = (event) => {
        const data = JSON.parse(event.data);
        if (data.type === 'nfc_scan') handleNfcDetection(data);
      };
      ws.current.onclose = () => setTimeout(connect, 3000);
    };
    connect();

    const handleKeyDown = (e) => {
      if (e.repeat) return;
      if (e.ctrlKey && e.shiftKey && e.key.toLowerCase() === 's') {
        e.preventDefault();
        triggerSimulation();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      if (ws.current) ws.current.close();
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isSimulating]);

  const ws = useRef(null);

  // Auto-advance Step 2 on NFC scan
  useEffect(() => {
    if (step === 'step2' && lastNfc) {
      addFragment('2', 'step3');
    }
  }, [lastNfc, step]);

  const addFragment = (val, nextStep) => {
    setFragments([...fragments, val]);
    setStep(nextStep);
    setCode('');
  };

  const checkEnigma = (e) => {
    e.preventDefault();
    if (code === '32') addFragment('3', 'step2');
    else { alert('Erreur : Regardez bien, chaque nombre grandit de la même façon !'); setCode(''); }
  };

  const checkFinalCode = (e) => {
    e.preventDefault();
    if (code === '3241') setStep('victory');
    else { alert('Code incorrect ! Relis bien l\'ordre des défis.'); setCode(''); }
  };

  const resetGame = () => {
    setStep('home');
    setFragments([]);
    setCode('');
    setLastNfc(null);
  };

  return (
    <div className="app-container">
      {/* Fragments Dashboard */}
      {step !== 'home' && step !== 'victory' && (
        <div className="fragments-bar">
          Fragments récupérés : {fragments.map((f, i) => <span key={i} className="fragment-chip">{f}</span>)}
          {[...Array(4 - fragments.length)].map((_, i) => <span key={i} className="fragment-placeholder">?</span>)}
        </div>
      )}

      {step === 'home' && (
        <div className="card">
          <h1>Défi'Pi</h1>
          <button className="btn" onClick={() => setStep('briefing')}>Lancer Mission 404</button>
        </div>
      )}

      {step === 'briefing' && (
        <div className="card">
          <h2 className="step-title">Mission 404 — Panique au serveur</h2>
          <p className="step-content">
            ALERTE 404 ! Le serveur de l’école ne répond plus.<br/>
            Les fichiers sont bloqués par le virus BUG-404.<br/>
            Réussis les 4 défis pour sauver le système !
          </p>
          <button className="btn" onClick={() => setStep('step1')}>C'est parti !</button>
        </div>
      )}

      {step === 'step1' && (
        <div className="card">
          <h2 className="step-title">Défi 1 : Le code d’accès</h2>
          <p className="step-content">Complète la suite :<br/><strong>2 - 4 - 8 - 16 - ?</strong></p>
          <form onSubmit={checkEnigma}>
            <input className="input-code" value={code} onChange={(e)=>setCode(e.target.value)} placeholder="??" autoFocus />
            <br/><button type="submit" className="btn">Valider</button>
          </form>
        </div>
      )}

      {step === 'step2' && (
        <div className="card">
          <h2 className="step-title">Défi 2 : La clé serveur</h2>
          <p className="step-content">Trouve la carte NFC <strong>“CLÉ SERVEUR”</strong> et passe-la sur le lecteur.</p>
          <div className="nfc-waiting">EN ATTENTE DU SCAN...</div>
          <button className="btn btn-simulate-nfc" onClick={triggerSimulation} disabled={isSimulating} style={{marginTop:'2rem', background:'var(--secondary-color)'}}>
            {isSimulating ? 'Simulé...' : 'Simuler Scan NFC'}
          </button>
        </div>
      )}

      {step === 'step3' && (
        <div className="card">
          <h2 className="step-title">Défi 3 : Le bon mot de passe</h2>
          <p className="step-content">Choisis le mot de passe le plus solide :</p>
          <div className="quiz-grid">
            <button className="btn-quiz" onClick={()=>alert('Trop court et facile !')}>A. ecole</button>
            <button className="btn-quiz" onClick={()=>alert('Trop simple !')}>B. 123456</button>
            <button className="btn-quiz" onClick={()=>alert('C\'est un mot du dictionnaire, trop risqué !')}>C. Chocolat</button>
            <button className="btn-quiz-success" onClick={()=>addFragment('4', 'step4')}>D. Crabe!Violet_27</button>
          </div>
        </div>
      )}

      {step === 'step4' && (
        <div className="card">
          <h2 className="step-title">Défi 4 : Le message suspect</h2>
          <p className="step-content">"Bravo ! Tu as gagné une tablette gratuite. Clique ici et donne ton mot de passe."<br/>Que fais-tu ?</p>
          <div className="quiz-grid">
            <button className="btn-quiz" onClick={()=>alert('Attention, c\'est sûrement un piège !')}>A. Cliquer vite</button>
            <button className="btn-quiz" onClick={()=>alert('Jamais ! C\'est un secret.')}>B. Donner mon mot de passe</button>
            <button className="btn-quiz-success" onClick={()=>addFragment('1', 'final')}>C. Demander à un adulte</button>
            <button className="btn-quiz" onClick={()=>alert('Non, ils risquent d\'être piratés aussi.')}>D. Envoyer aux amis</button>
          </div>
        </div>
      )}

      {step === 'final' && (
        <div className="card">
          <h2 className="step-title">Dernière étape : Redémarrage</h2>
          <p className="step-content">Remets les fragments dans l'ordre de la mission pour former le code final.</p>
          <form onSubmit={checkFinalCode}>
            <input className="input-code" value={code} onChange={(e)=>setCode(e.target.value)} placeholder="0000" autoFocus />
            <br/><button type="submit" className="btn">REDÉMARRER</button>
          </form>
        </div>
      )}

      {step === 'victory' && (
        <div className="card">
          <h1 className="victory">VICTOIRE !</h1>
          <h2 className="step-title">Mission Réussie</h2>
          <p className="step-content">
            Votre équipe a sauvé le serveur de l’école !<br/>
            Titre : <strong>Brigade Anti-Bug niveau 1</strong>
          </p>
          <button className="btn" onClick={resetGame}>Rejouer</button>
        </div>
      )}

      {step !== 'home' && (
        <button className="btn-home-link" onClick={resetGame}>Retour Accueil</button>
      )}

      <button className="simulate-btn" onClick={triggerSimulation} disabled={isSimulating || step !== 'step2'}>Simuler NFC (Ctrl+Shift+S)</button>
    </div>
  );
}

export default App;
