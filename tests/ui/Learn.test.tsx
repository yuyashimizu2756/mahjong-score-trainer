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
      <div data-scroll-root>
        <LearnPage
          settings={DEFAULT_SETTINGS}
          onNavigatePractice={vi.fn()}
        />
      </div>
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

function stubQuizRects(feedbackVisible: boolean) {
  const original = Element.prototype.getBoundingClientRect;
  const rect = (top: number, bottom: number): DOMRect =>
    ({
      top,
      bottom,
      left: 0,
      right: 700,
      width: 700,
      height: bottom - top,
      x: 0,
      y: top,
      toJSON: () => ({}),
    }) as DOMRect;
  return vi
    .spyOn(Element.prototype, 'getBoundingClientRect')
    .mockImplementation(function (this: Element) {
      if (this.hasAttribute('data-scroll-root')) return rect(0, 700);
      if (this.getAttribute('data-testid') === 'quiz-feedback') {
        return feedbackVisible ? rect(100, 200) : rect(800, 900);
      }
      return original.call(this);
    });
}

describe('学習', () => {
  beforeEach(() => {
    window.localStorage.clear();
    initStorage();
    if (typeof Element.prototype.scrollIntoView !== 'function') {
      Element.prototype.scrollIntoView = function () {};
    }
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

  it('確認問題の回答後、見えていなければフィードバックへスクロールする', () => {
    const scrollSpy = vi.fn();
    Element.prototype.scrollIntoView = scrollSpy;
    const rectSpy = stubQuizRects(false);
    try {
      renderLearn();
      const quiz = LESSONS[0].quizzes[0];
      const block = screen.getByTestId(`quiz-${quiz.id}`);
      fireEvent.click(within(block).getAllByTestId('quiz-choice')[quiz.correctIndex]);
      expect(scrollSpy).toHaveBeenCalledWith({
        block: 'nearest',
        behavior: 'smooth',
      });
      expect(screen.getByTestId('quiz-feedback')).toBeInTheDocument();
    } finally {
      rectSpy.mockRestore();
    }
  });

  it('フィードバックがすでに見える場合はスクロールしない', () => {
    const scrollSpy = vi.fn();
    Element.prototype.scrollIntoView = scrollSpy;
    const rectSpy = stubQuizRects(true);
    try {
      renderLearn();
      const quiz = LESSONS[0].quizzes[0];
      const block = screen.getByTestId(`quiz-${quiz.id}`);
      fireEvent.click(within(block).getAllByTestId('quiz-choice')[quiz.correctIndex]);
      expect(scrollSpy).not.toHaveBeenCalled();
    } finally {
      rectSpy.mockRestore();
    }
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
