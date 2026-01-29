import React, { useState, useEffect } from "react";
import { supabase } from "./supabase"; // Certifique-se que src/supabase.js está configurado

// ================= CONFIG =================
const DEFAULT_PEOPLE = [
  "Augusto","Cris Lage","Gabriela","Giovanna","Hanna","Helo","Janja",
  "Joao","Juan","Juliete","Mari","Silas"
].sort((a,b)=>a.localeCompare(b));

const DEFAULT_EMOJIS = ["❤️","🤥","🤮","🐍","👜","💔","🪴","🎯","🍌","💣"];
// =========================================

export default function App() {
  const [people] = useState(DEFAULT_PEOPLE);
  const [emojis] = useState(DEFAULT_EMOJIS);
  const [currentUser, setCurrentUser] = useState("");
  const [password, setPassword] = useState("");
  const [step, setStep] = useState("home"); // home | login | register | vote | results
  const [selected, setSelected] = useState({});
  const [votes, setVotes] = useState({});
  const [totalVoters, setTotalVoters] = useState(0);
  const today = new Date();
  const todayKey = today.toISOString().slice(0,10);
  const todayFormatted = today.toLocaleDateString("pt-BR", { weekday: "long", day: "2-digit", month: "long", year: "numeric" });

  // ================= FUNÇÕES =================

  // Carrega votos globais
  const loadVotes = async () => {
    const { data } = await supabase
      .from("votes")
      .select("*")
      .eq("day", todayKey);

    const newVotes = {};
    data.forEach(v => {
      const target = v.target.trim(); // remove espaços extras
      if (!newVotes[target]) newVotes[target] = {};
      if (!newVotes[target][v.emoji]) newVotes[target][v.emoji] = 0;
      newVotes[target][v.emoji] += 1;
    });
    setVotes(newVotes);

    // Contar votantes distintos
    const votersSet = new Set(data.map(v => v.voter.trim()));
    setTotalVoters(votersSet.size);
  };

  useEffect(() => {
    loadVotes();
  }, []);

  // Seleção única de emoji
  const handleVote = (person, emoji) => {
    setSelected(prev => ({ ...prev, [person]: emoji }));
  };

  // Finalizar votação
  const finishVoting = async () => {
    if (Object.keys(selected).length !== people.length - 1) {
      alert("Você deve votar em todos os participantes!");
      return;
    }

    const voteData = people.filter(p => p !== currentUser).map(person => ({
      voter: currentUser,
      target: person,
      emoji: selected[person],
      day: todayKey
    }));

    const { error } = await supabase.from("votes").insert(voteData);
    if (error) return alert("Erro ao registrar votos: " + error.message);

    alert("Voto registrado! Resultados liberados após 5 pessoas votarem.");
    setStep("results");
    loadVotes();
  };

  // ================= RENDER =================

  if (step === "home") {
    return (
      <div style={styles.container}>
        <h1>Queridômetro dxs Gaymers</h1>
        <p style={{opacity:0.7}}>📅 {todayFormatted}</p>
        <p>Responde 1x por dia. Reset automático diário.</p>
        <button style={styles.mainBtn} onClick={() => setStep("login")}>Responder</button>
        <button style={styles.mainBtn} onClick={() => setStep("results")}>Ver Resultados</button>
      </div>
    );
  }

  // LOGIN
  if (step === "login") {
    const [users, setUsers] = useState({});
    useEffect(() => {
      const loadUsers = async () => {
        const { data } = await supabase.from("users").select("*");
        const map = {};
        data.forEach(u => map[u.name.trim()] = u.password);
        setUsers(map);
      };
      loadUsers();
    }, []);

    return (
      <div style={styles.container}>
        <h1>Identificação</h1>
        <select value={currentUser} onChange={e => setCurrentUser(e.target.value)}>
          <option value="">Selecione seu nome</option>
          {people.map(p => <option key={p}>{p}</option>)}
        </select>
        <input type="password" placeholder="Senha" value={password} onChange={e => setPassword(e.target.value)} />
        <div>
          <button disabled={!currentUser} onClick={async () => {
            if (!users[currentUser]) setStep("register");
            else if (users[currentUser] === password) {
              const { data } = await supabase.from("votes").select("*").eq("voter", currentUser).eq("day", todayKey);
              if (data.length > 0) alert("Você já respondeu hoje.");
              else setStep("vote");
            } else alert("Senha incorreta");
          }}>Entrar</button>
        </div>
      </div>
    );
  }

  // REGISTRAR SENHA
  if (step === "register") {
    return (
      <div style={styles.container}>
        <h1>Criar senha</h1>
        <p>Primeiro acesso de {currentUser}</p>
        <input type="password" placeholder="Nova senha" value={password} onChange={e => setPassword(e.target.value)} />
        <button onClick={async () => {
          if (!password) return alert("Defina uma senha");
          const { error } = await supabase.from("users").insert({ name: currentUser, password });
          if (error) return alert("Erro ao criar usuário: " + error.message);
          setStep("vote");
        }}>Salvar e Entrar</button>
      </div>
    );
  }

  // VOTAÇÃO
  if (step === "vote") {
    return (
      <div style={styles.container}>
        <h1>Distribua seus emojis</h1>
        <p>Votando como <b>{currentUser}</b> (anônimo)</p>
        {people.filter(p => p !== currentUser).map(person => (
          <div key={person} style={styles.card}>
            <h3>{person}</h3>
            <div style={styles.emojiRow}>
              {emojis.map(e => (
                <button
                  key={e}
                  style={{
                    ...styles.emojiBtn,
                    background: selected[person] === e ? "#22c55e" : "#222",
                    transform: selected[person] === e ? "scale(1.2)" : "scale(1)",
                    boxShadow: selected[person] === e ? "0 0 12px #22c55e" : "none"
                  }}
                  onClick={() => handleVote(person, e)}
                >
                  {e}
                </button>
              ))}
            </div>
          </div>
        ))}
        <button style={styles.mainBtn} onClick={finishVoting}>Finalizar Voto</button>
      </div>
    );
  }

  // RESULTADOS
  if (step === "results") {
    const showResults = totalVoters >= 5;

    return (
      <div style={styles.container}>
        <h1>Resultados do Queridômetro</h1>
        <p style={{opacity:0.7}}>📅 {todayFormatted}</p>

        {!showResults && <p>Os resultados serão liberados após 5 pessoas votarem.</p>}

        {showResults && people.map(person => (
          <div key={person} style={{
            ...styles.card,
            background: currentUser === person ? "#3333aa" : "#111"
          }}>
            <h3>{person}</h3>
            <div>
              {emojis.map(e => <span key={e} style={{ marginRight: 12 }}>{e} {votes[person]?.[e] || 0}</span>)}
            </div>
          </div>
        ))}

        <button style={styles.mainBtn} onClick={() => setStep("home")}>Voltar</button>
      </div>
    );
  }

  return null;
}

// ================= STYLES =================
const styles = {
  container: { maxWidth: 700, margin: "40px auto", fontFamily: "sans-serif", textAlign: "center" },
  card: { background: "#111", color: "#fff", padding: 15, marginBottom: 12, borderRadius: 12 },
  emojiRow: { display: "flex", flexWrap: "wrap", gap: 8, justifyContent: "center" },
  emojiBtn: { fontSize: 26, padding: 10, borderRadius: 12, cursor: "pointer", border: "none", transition: "0.15s all" },
  mainBtn: { fontSize: 18, padding: "10px 20px", margin: 10, borderRadius: 10, border: "none", cursor: "pointer" },
};
