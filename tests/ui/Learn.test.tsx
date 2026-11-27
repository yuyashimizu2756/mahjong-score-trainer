import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { AppProvider } from '../../src/lib/store';
import { LearnPage } from '../../src/features/learn/LearnPage';
import { LESSONS } from '../../src/data/lessons';
import {
  DEFAULT_SETTINGS,
  initStorage,
  loadLearn,
} from '../../src/lib/storage';

function renderLearn() {
  return render(
    <AppProvider>
      <LearnPage
        settings={DEFAULT_SETTINGS}
        onNavigatePractice={vi.fn()}
      />
    </AppProvider>,
  );
}

function answerQuiz(lesson: (typeof LESSONS)[number], correct: boolean) {
  for (const quiz of lesson.quizzes) {
    const block = screen.getByTestId(`quiz-${quiz.id}`);
    const choices = within(block).getAllByTestId('quiz-choice');
    const index = correct
      ? quiz.correctIndex
      : (quiz.correctIndex + 1) % quiz.choices.length;
    fireEvent.click(choices[index]);
  }
}

describe('学習', () => {
  beforeEach(() => {
    window.localStorage.clear();
    initStorage();
  });

  it('6 レッスンの一覧と本文を表示する', () => {
    renderLearn();
    expect(screen.getByRole('heading', { level: 1, name: '学習' })).toBeInTheDocument();
    expect(LESSONS).toHaveLength(6);
    for (const lesson of LESSONS) {
      expect(lesson.quizzes.length).toBeGreaterThanOrEqual(2);
      expect(lesson.quizzes.length).toBeLessThanOrEqual(3);
      expect(
        screen.getAllByRole('button', { name: new RegExp(lesson.title) }).length,
      ).toBeGreaterThan(0);
    }
    expect(
      screen.getByRole('heading', { level: 2, name: '点数計算の全体像' }),
    ).toBeInTheDocument();
    expect(screen.getByText('確認問題')).toBeInTheDocument();
  });

  it('確認問題にすべて正解するとレッスン完了が保存される', async () => {
    renderLearn();
    answerQuiz(LESSONS[0], true);

    await waitFor(() => {
      expect(loadLearn().lessons.basics?.completed).toBe(true);
    });
    expect(loadLearn().lessons.basics.quizCorrect).toBe(
      LESSONS[0].quizzes.length,
    );
    expect(loadLearn().lessons.basics.quizTotal).toBe(
      LESSONS[0].quizzes.length,
    );
    expect(
      screen.getByText(/全 \d+ 問正解。このレッスンは完了です。/),
    ).toBeInTheDocument();
  });

  it('誤答があると完了にならず、正答数が保存される', async () => {
    renderLearn();
    answerQuiz(LESSONS[0], false);

    await waitFor(() => {
      expect(loadLearn().lessons.basics?.quizTotal).toBe(
        LESSONS[0].quizzes.length,
      );
    });
    expect(loadLearn().lessons.basics.completed).toBe(false);
    expect(loadLearn().lessons.basics.quizCorrect).toBe(0);
    expect(
      screen.getByText(/もう一度挑戦しましょう。/),
    ).toBeInTheDocument();
  });

  it('レッスンを切り替えると本文が変わる', () => {
    renderLearn();
    fireEvent.click(screen.getByRole('button', { name: /役と翻/ }));
    expect(
      screen.getByRole('heading', { level: 2, name: '役と翻' }),
    ).toBeInTheDocument();
    expect(screen.getByText('喰い下がり')).toBeInTheDocument();
  });
});
