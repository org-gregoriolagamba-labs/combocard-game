import React from 'react';
import { render, screen, within } from '@testing-library/react';
import '@testing-library/jest-dom';
import { PlayersList } from '../../components/game';

const game = (players, turno = null) => ({
  players: players.map((p) => ({ id: p.id, name: p.name, gettoni: 10, collezioni: [], jollyUsato: false, ...p })),
  turno,
});

const riga = (nome) => screen.getByText(new RegExp(`^${nome}`)).closest('li');

describe('PlayersList and the cards of discipline', () => {
  test('a player with no warning shows no card', () => {
    render(<PlayersList game={game([{ id: 'a', name: 'Anna' }])} currentPlayerId="a" />);

    expect(within(riga('Anna')).queryByText(/cartellino|ammonizione/i)).not.toBeInTheDocument();
  });

  test('a yellow card says so in words, not only in colour', () => {
    render(<PlayersList game={game([{ id: 'a', name: 'Anna', ammonizioni: 1 }])} currentPlayerId="b" />);

    expect(within(riga('Anna')).getByText('Cartellino giallo')).toBeInTheDocument();
  });

  test('a red card says so, and replaces the yellow', () => {
    render(<PlayersList game={game([{ id: 'a', name: 'Anna', ammonizioni: 2, espulso: true }])} currentPlayerId="b" />);

    const r = riga('Anna');
    expect(within(r).getByText('Cartellino rosso: non estrae più')).toBeInTheDocument();
    expect(within(r).queryByText('Cartellino giallo')).not.toBeInTheDocument();
  });

  test('the player on turn is marked', () => {
    render(
      <PlayersList
        game={game([{ id: 'a', name: 'Anna' }, { id: 'b', name: 'Bruno' }], { playerId: 'b' })}
        currentPlayerId="a"
      />,
    );

    expect(within(riga('Bruno')).getByText('Estrae')).toBeInTheDocument();
    expect(within(riga('Anna')).queryByText('Estrae')).not.toBeInTheDocument();
  });

  test('with no turn (the classic mode) nobody is marked', () => {
    render(<PlayersList game={game([{ id: 'a', name: 'Anna' }])} currentPlayerId="a" />);

    expect(screen.queryByText('Estrae')).not.toBeInTheDocument();
  });
});
