import React, { useState, useEffect } from "react";
import { supabase } from "./supabase";

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
  const [users, setUsers] = useState({});
  const [votedToday, setVotedToday] = useState({});
  const [votes, setVotes] = useState({});
  const [selected, setSelected] = useState({});
  const [step, setStep] = useState("home"); // home | login | register | vote | results

  const today = new Date();
  const todayKey = today.toISOString().slice(0,10);
  const todayFormatted = today.toLocaleDateString("pt-BR", { weekday: "long", day: "2-digit", month: "long", year: "numeric" });

  // ------------------ Load votes and users ------------------
  useEffect(() => {
    const fetchData = async () => {
      const { data: voteData, error: voteErr } = await supabase
        .from("votes")
        .select("*")
        .eq("day", todayKey);
      if (voteErr) console.error(voteErr);

      const newVotes = {};
      voteData?.forEach(v => {
        let target = v.target.trim();
        const normalizedTarget = target.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
        const matched = people.find(p => 
          p.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "") === normalizedTarget
        );
        if (!matched) return;
        target = matched;

        if (!newVotes[target]) newVotes[target] = {};
        if (!newVotes[target][v.emoji]) newVotes[target][v.emoji] = 0;
        newVotes[target][v.emoji] += 1;
      });
      setVotes(newVotes);

      // Carrega usuários e votos do localStorage
      setUsers(JSON.parse(localStorage.getItem("queridometro_users") || "{}"));
      setVotedToday(JSON.parse(localStorage.getItem("queridometro_voted") || "{}"));
    };
    fetchData();
  }, []);

  // ------------------ Helpers ------------------
  const saveUsers = (newUsers) => {
    setUsers(newUsers);
    localStorage.setItem("queridometro_users", JSON.stringify(newUsers));
  };

  const saveVoted = (newVoted) => {
    setVotedToday(newVoted);
    localStorage.setItem("queridometro_voted", JSON.stringify(newVoted));
  };

  const handleVote = (person, emoji) => {
    // Seleção única
    setSelected(prev => ({ ...prev, [person]: { [emoji]: true } }));
  };

  const finishVoting = async () => {
    const notVoted = people.filter(p => p !== currentUser && !selected[p]);
    if (notVoted.length > 0) {
      return alert("Você precisa votar em todos!");
    }

    // Grava votos no Supabase
    for (const person of people.filter(p => p !== currentUser)) {
      const emoji = Object.keys(selected[person])[0];
      await supabase.from("votes").insert({
        voter: currentUser,
        target: person,
        emoji: emoji,
        day: todayKey
      });
    }

    const newVoted = { ...votedToday, [currentUser]: true };
    saveVoted(newVoted);
    setStep("results");
  };

  const totalVotes = (person) => {
    return emojis.reduce((sum, e) => sum + (votes[person]?.[e] || 0), 0);
  };

  const totalVotersToday = Object.keys(votedToday).length;

  // ------------------ RENDER ------------------
  if (step === "home") {
    return (
      <div style={styles.container}>
        <h1>Queridômetro dxs Gaymers</h1>
        <p style={{opacity:0.7}}>📅 {todayFormatted}</p>
        <p>Responde 1x por dia. Reset diário automático.</p>
        <button style={styles.mainBtn} onClick={() => setStep("login")}>Responder</button>
        <button style={styles.mainBtn} onClick={() => setStep("results")}>Ver Resultados</button>
      </div>
    );
  }

  // LOGIN
  if (step === "login") {
    return (
      <div style={styles.container}>
        <h1>Identificação</h1>
        <select value={currentUser} onChange={e => setCurrentUser(e.target.value)}>
          <option value="">Selecione seu nome</option>
          {people.map(p => (
            <option key={p} value={p}>{p}</option>
          ))}
        </select>
        <input type="password" placeholder="Senha" value={password} onChange={e => setPassword(e.target.value)} />
        <div>
          <button disabled={!currentUser} onClick={() => {
            if (!users[currentUser]) setStep("register");
            else if (users[currentUser].password === password) {
              if (votedToday[currentUser]) alert("Você já respondeu hoje.");
              else setStep("vote");
            } else alert("Senha incorreta");
          }}>Entrar</button>
        </div>
      </div>
    );
  }

  // REGISTER
  if (step === "register") {
    return (
      <div style={styles.container}>
        <h1>Criar senha</h1>
        <p>Primeiro acesso de {currentUser}</p>
        <input type="password" placeholder="Nova senha" value={password} onChange={e => setPassword(e.target.value)} />
        <button onClick={() => {
          if (!password) return alert("Defina uma senha");
          const newUsers = { ...users, [currentUser]: { password } };
          saveUsers(newUsers);
          setStep("vote");
        }}>Salvar e Entrar</button>
      </div>
    );
  }

  // VOTING
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
                    background: selected[person]?.[e] ? "#22c55e" : "#222",
                    transform: selected[person]?.[e] ? "scale(1.2)" : "scale(1)",
                    boxShadow: selected[person]?.[e] ? "0 0 12px #22c55e" : "none"
                  }}
                  onClick={() => handleVote(person, e)}
                >
                  {e}
                </button>
              ))}
            </div>
          </div>
        ))}
        <button onClick={finishVoting}>Finalizar Voto</button>
      </div>
    );
  }

  // RESULTS
  if (step === "results") {
    return (
      <div style={styles.container}>
        <h1>Resultados do Queridômetro</h1>
        <p style={{opacity:0.7}}>📅 {todayFormatted}</p>
        {totalVotersToday < 5 ? (
          <p>Aguardando pelo menos 5 votos para liberar resultados...</p>
        ) : (
          <>
            <h2>Detalhado</h2>
            {people.map(person => (
              <div
                key={person}
                style={{
                  ...styles.card,
                  background: person === currentUser ? "#334155" : "#111"
                }}
              >
                <h3>{person}</h3>
                <div>
                  {emojis.map(e => <span key={e} style={{ marginRight: 12 }}>{e} {votes[person]?.[e] || 0}</span>)}
                </div>
              </div>
            ))}
          </>
        )}
        <button onClick={() => setStep("home")}>Voltar</button>
      </div>
    );
  }
}

// ------------------ STYLES ------------------
const styles = {
  container: { maxWidth: 700, margin: "40px auto", fontFamily: "sans-serif", textAlign: "center" },
  card: { background: "#111", color: "#fff", padding: 15, marginBottom: 12, borderRadius: 12 },
  emojiRow: { display: "flex", flexWrap: "wrap", gap: 8, justifyContent: "center" },
  emojiBtn: { fontSize: 26, padding: 10, borderRadius: 12, cursor: "pointer", border: "none", transition: "0.15s all" },
  mainBtn: { fontSize: 18, padding: "10px 20px", margin: 10, borderRadius: 10, border: "none", cursor: "pointer" },
};
