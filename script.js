const spaViews = document.querySelectorAll('.spa-view');
const spaLinks = document.querySelectorAll('.spa-link');
const validRoutes = new Set(['home', 'focus', 'breakdown', 'tracker']);

const showRoute = (requestedRoute) => {
  const route = validRoutes.has(requestedRoute) ? requestedRoute : 'home';
  spaViews.forEach((view) => {
    view.hidden = view.dataset.view !== route;
  });
  document.querySelectorAll('.site-nav .spa-link').forEach((link) => {
    const active = link.dataset.route === route;
    link.classList.toggle('active', active);
    if (active) link.setAttribute('aria-current', 'page');
    else link.removeAttribute('aria-current');
  });
  document.body.dataset.page = route;
  window.scrollTo({ top: 0, behavior: 'auto' });
};

const routeFromHash = () => window.location.hash.slice(1) || 'home';
spaLinks.forEach((link) => link.addEventListener('click', () => showRoute(link.dataset.route)));
window.addEventListener('hashchange', () => showRoute(routeFromHash()));
showRoute(routeFromHash());

const footerNote = document.querySelector('#footer-note');

if (footerNote) {
  footerNote.textContent = `ADHD Student Helper - ${new Date().getFullYear()}`;
}

const spotifyTriggers = document.querySelectorAll('.spotify-widget-trigger');

if (spotifyTriggers.length) {
  const spotifyDialog = document.createElement('dialog');
  spotifyDialog.className = 'spotify-widget';
  spotifyDialog.id = 'spotify-widget';
  spotifyDialog.setAttribute('aria-labelledby', 'spotify-widget-title');

  const widgetHeader = document.createElement('div');
  widgetHeader.className = 'spotify-widget-header';

  const widgetHeading = document.createElement('div');
  const widgetEyebrow = document.createElement('p');
  widgetEyebrow.className = 'eyebrow';
  widgetEyebrow.textContent = 'Study soundtrack';
  const widgetTitle = document.createElement('h2');
  widgetTitle.id = 'spotify-widget-title';
  widgetTitle.textContent = 'Study Playlist';
  widgetHeading.append(widgetEyebrow, widgetTitle);

  const closeWidget = document.createElement('button');
  closeWidget.className = 'spotify-widget-close';
  closeWidget.type = 'button';
  closeWidget.setAttribute('aria-label', 'Close Spotify playlist');
  closeWidget.textContent = '×';
  widgetHeader.append(widgetHeading, closeWidget);

  const spotifyFrame = document.createElement('iframe');
  spotifyFrame.className = 'spotify-embed';
  spotifyFrame.title = 'Spotify Study Playlist';
  spotifyFrame.src = 'https://open.spotify.com/embed/playlist/62rUlcPhrLl7emwGg9Ay2O?utm_source=generator&theme=0';
  spotifyFrame.width = '100%';
  spotifyFrame.height = '500';
  spotifyFrame.loading = 'lazy';
  spotifyFrame.allow = 'autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture';
  spotifyFrame.setAttribute('allowfullscreen', '');

  spotifyDialog.append(widgetHeader, spotifyFrame);
  document.body.append(spotifyDialog);

  const openWidget = (event) => {
    event.preventDefault();
    if (!spotifyDialog.open) spotifyDialog.show();
  };

  spotifyTriggers.forEach((trigger) => trigger.addEventListener('click', openWidget));
  closeWidget.addEventListener('click', () => spotifyDialog.close());
  spotifyDialog.addEventListener('click', (event) => {
    if (event.target === spotifyDialog) spotifyDialog.close();
  });
}

const assignmentTriggers = document.querySelectorAll('.assignments-widget-trigger');

if (assignmentTriggers.length) {
  const storageKey = 'adhd-helper-assignments';
  const assignmentsDialog = document.createElement('dialog');
  assignmentsDialog.className = 'assignments-widget';
  assignmentsDialog.id = 'assignments-widget';
  assignmentsDialog.setAttribute('aria-labelledby', 'assignments-widget-title');
  assignmentsDialog.innerHTML = `
    <div class="assignments-widget-header">
      <div>
        <p class="eyebrow">Stay on track</p>
        <h2 id="assignments-widget-title">My Assignments</h2>
      </div>
      <button class="assignments-widget-close" type="button" aria-label="Close assignments checklist">×</button>
    </div>
    <form class="assignment-form">
      <label class="sr-only" for="new-assignment">Add an assignment</label>
      <input id="new-assignment" class="task-input" type="text" maxlength="100" placeholder="Add an assignment…" required>
      <button class="button primary compact" type="submit">Add</button>
    </form>
    <p class="assignment-summary" aria-live="polite"></p>
    <ul class="assignment-list" aria-label="Assignment checklist"></ul>
    <p class="assignment-empty">No assignments yet. Add one above to get started.</p>
  `;
  document.body.append(assignmentsDialog);

  const form = assignmentsDialog.querySelector('.assignment-form');
  const input = assignmentsDialog.querySelector('#new-assignment');
  const list = assignmentsDialog.querySelector('.assignment-list');
  const summary = assignmentsDialog.querySelector('.assignment-summary');
  const emptyMessage = assignmentsDialog.querySelector('.assignment-empty');
  const closeButton = assignmentsDialog.querySelector('.assignments-widget-close');
  let assignments = [];

  try {
    const storedAssignments = JSON.parse(localStorage.getItem(storageKey));
    if (Array.isArray(storedAssignments)) assignments = storedAssignments;
  } catch (error) {
    assignments = [];
  }

  const saveAssignments = () => localStorage.setItem(storageKey, JSON.stringify(assignments));

  const renderAssignments = () => {
    list.replaceChildren();
    assignments.forEach((assignment) => {
      const item = document.createElement('li');
      if (assignment.completed) item.classList.add('completed');

      const label = document.createElement('label');
      const checkbox = document.createElement('input');
      checkbox.type = 'checkbox';
      checkbox.checked = assignment.completed;
      checkbox.setAttribute('aria-label', `Mark ${assignment.text} as ${assignment.completed ? 'incomplete' : 'complete'}`);
      checkbox.addEventListener('change', () => {
        assignment.completed = checkbox.checked;
        saveAssignments();
        renderAssignments();
      });

      const text = document.createElement('span');
      text.textContent = assignment.text;
      label.append(checkbox, text);

      const removeButton = document.createElement('button');
      removeButton.type = 'button';
      removeButton.className = 'assignment-remove';
      removeButton.textContent = 'Remove';
      removeButton.setAttribute('aria-label', `Remove ${assignment.text}`);
      removeButton.addEventListener('click', () => {
        assignments = assignments.filter((itemToKeep) => itemToKeep.id !== assignment.id);
        saveAssignments();
        renderAssignments();
      });

      item.append(label, removeButton);
      list.append(item);
    });

    const completedCount = assignments.filter((assignment) => assignment.completed).length;
    summary.textContent = assignments.length
      ? `${completedCount} of ${assignments.length} completed`
      : 'Your checklist is clear.';
    emptyMessage.hidden = assignments.length > 0;
  };

  form.addEventListener('submit', (event) => {
    event.preventDefault();
    const text = input.value.trim();
    if (!text) return;
    assignments.push({ id: `${Date.now()}-${Math.random()}`, text, completed: false });
    saveAssignments();
    renderAssignments();
    form.reset();
    input.focus();
  });

  assignmentTriggers.forEach((trigger) => trigger.addEventListener('click', (event) => {
    event.preventDefault();
    if (!assignmentsDialog.open) assignmentsDialog.show();
    input.focus();
  }));
  closeButton.addEventListener('click', () => assignmentsDialog.close());
  assignmentsDialog.addEventListener('click', (event) => {
    if (event.target === assignmentsDialog) assignmentsDialog.close();
  });
  renderAssignments();
}

const focusTimer = document.querySelector('.focus-layout');

if (focusTimer) {
  const durationButtons = focusTimer.querySelectorAll('.duration-button');
  const taskInput = document.querySelector('#task-name');
  const modeTitle = document.querySelector('#mode-title');
  const timeLeft = document.querySelector('#time-left');
  const timerContext = document.querySelector('#timer-context');
  const sessionProgress = document.querySelector('#session-progress');
  const startPauseButton = document.querySelector('#start-pause');
  const resetButton = document.querySelector('#reset-timer');
  const finishButton = document.querySelector('#finish-session');
  const newBreakButton = document.querySelector('#new-break');
  const breakSuggestion = document.querySelector('#break-suggestion');
  const sessionStatus = document.querySelector('#session-status');
  const sessionDots = focusTimer.querySelectorAll('.session-dot');
  const badgeList = focusTimer.querySelectorAll('.badge');
  const pointsCount = document.querySelector('#points-count');

  const breakIdeas = [
    'Stand up and roll your shoulders for 30 seconds.',
    'Walk to get water, then take three slow breaths.',
    'Stretch your hands, wrists, and neck before sitting back down.',
    'Do ten gentle calf raises beside your chair.',
    'Look across the room and relax your eyes for one minute.',
    'Shake out your arms and reset your posture.'
  ];

  const state = {
    selectedMinutes: 10,
    mode: 'focus',
    secondsRemaining: 10 * 60,
    totalSeconds: 10 * 60,
    completedSessions: 0,
    points: 0,
    timerId: null,
    breakIndex: 0,
    earnedBadges: new Set()
  };

  const formatTime = (seconds) => {
    const minutes = Math.floor(seconds / 60);
    const remainder = seconds % 60;
    return `${minutes}:${String(remainder).padStart(2, '0')}`;
  };

  const currentTask = () => taskInput.value.trim() || 'your study task';

  const updateBadges = () => {
    badgeList.forEach((badge) => {
      badge.classList.toggle('locked', !state.earnedBadges.has(badge.dataset.badge));
    });
  };

  const updateDisplay = () => {
    const progress = ((state.totalSeconds - state.secondsRemaining) / state.totalSeconds) * 100;
    const task = currentTask();

    modeTitle.textContent = state.mode === 'focus' ? 'Focus Session' : 'Movement Break';
    timeLeft.textContent = formatTime(state.secondsRemaining);
    sessionProgress.style.width = `${Math.max(0, Math.min(progress, 100))}%`;
    pointsCount.textContent = state.points;
    sessionStatus.textContent = `${state.completedSessions} of 4 focus sessions completed.`;
    finishButton.textContent = state.mode === 'focus' ? 'Complete Session' : 'End Break';

    if (state.mode === 'focus') {
      timerContext.textContent = `Focus on ${task}. A 5-minute break is waiting after this session.`;
    } else {
      timerContext.textContent = `Break time. Try this: ${breakSuggestion.textContent}`;
    }

    sessionDots.forEach((dot, index) => {
      dot.classList.toggle('complete', index < state.completedSessions);
    });

    updateBadges();
  };

  const stopTimer = () => {
    window.clearInterval(state.timerId);
    state.timerId = null;
    startPauseButton.textContent = 'Start';
  };

  const setMode = (mode) => {
    state.mode = mode;
    state.totalSeconds = mode === 'focus' ? state.selectedMinutes * 60 : 5 * 60;
    state.secondsRemaining = state.totalSeconds;
    sessionProgress.style.width = '0%';
    updateDisplay();
  };

  const completeFocusSession = () => {
    stopTimer();
    state.completedSessions = Math.min(state.completedSessions + 1, 4);
    state.points += 10;
    state.earnedBadges.add('first');

    if (state.points >= 40) {
      state.earnedBadges.add('reset');
    }

    if (state.completedSessions >= 4) {
      state.earnedBadges.add('streak');
    }

    breakSuggestion.textContent = breakIdeas[state.breakIndex];

    if (state.completedSessions >= 4) {
      timerContext.textContent = 'Focus Streak badge earned. Take a real break before starting another round.';
    }

    setMode('break');
  };

  const completeBreak = () => {
    stopTimer();

    if (state.completedSessions >= 4) {
      state.completedSessions = 0;
    }

    setMode('focus');
  };

  const tick = () => {
    if (state.secondsRemaining > 0) {
      state.secondsRemaining -= 1;
      updateDisplay();
      return;
    }

    if (state.mode === 'focus') {
      completeFocusSession();
    } else {
      completeBreak();
    }
  };

  durationButtons.forEach((button) => {
    button.addEventListener('click', () => {
      durationButtons.forEach((item) => item.classList.remove('active'));
      button.classList.add('active');
      state.selectedMinutes = Number(button.dataset.minutes);
      stopTimer();
      setMode('focus');
    });
  });

  startPauseButton.addEventListener('click', () => {
    if (state.timerId) {
      stopTimer();
      updateDisplay();
      return;
    }

    startPauseButton.textContent = 'Pause';
    state.timerId = window.setInterval(tick, 1000);
    updateDisplay();
  });

  resetButton.addEventListener('click', () => {
    stopTimer();
    setMode(state.mode);
  });

  finishButton.addEventListener('click', () => {
    if (state.mode === 'focus') {
      completeFocusSession();
    } else {
      completeBreak();
    }
  });

  newBreakButton.addEventListener('click', () => {
    state.breakIndex = (state.breakIndex + 1) % breakIdeas.length;
    breakSuggestion.textContent = breakIdeas[state.breakIndex];
    updateDisplay();
  });

  taskInput.addEventListener('input', updateDisplay);

  updateDisplay();
}

const assignmentTool = document.querySelector('.breakdown-layout');

if (assignmentTool) {
  const assignmentInput = document.querySelector('#assignment-input');
  const breakdownButton = document.querySelector('#breakdown-button');
  const exampleButton = document.querySelector('#example-assignment');
  const clearButton = document.querySelector('#clear-steps');
  const stepList = document.querySelector('#step-list');
  const assignmentTitle = document.querySelector('#assignment-title');
  const breakdownStatus = document.querySelector('#breakdown-status');
  const breakdownProgress = document.querySelector('#breakdown-progress');
  const breakdownCount = document.querySelector('#breakdown-count');
  const nextStep = document.querySelector('#next-step');

  let activeRequest = null;
  const requestStatus = document.querySelector('#breakdown-request-status');
  const setLoading = (loading) => {
    breakdownButton.disabled = loading;
    exampleButton.disabled = loading;
    breakdownButton.textContent = loading ? 'Breaking it down…' : 'Break It Down';
    assignmentTool.setAttribute('aria-busy', String(loading));
  };

  const updateBreakdownProgress = () => {
    const checkboxes = stepList.querySelectorAll('input[type="checkbox"]');
    const completed = [...checkboxes].filter((checkbox) => checkbox.checked).length;
    const total = checkboxes.length;
    const percent = total ? Math.round((completed / total) * 100) : 0;
    const nextUnchecked = [...checkboxes].find((checkbox) => !checkbox.checked);

    breakdownProgress.style.width = `${percent}%`;
    breakdownCount.textContent = percent;
    breakdownStatus.textContent = total
      ? `${completed} of ${total} steps checked off.`
      : 'No steps yet.';

    nextStep.textContent = nextUnchecked
      ? nextUnchecked.nextElementSibling.textContent
      : total
        ? 'All steps complete. Nice work.'
        : 'Enter an assignment and break it down.';

    checkboxes.forEach((checkbox) => {
      checkbox.closest('.step-item').classList.toggle('complete', checkbox.checked);
    });
  };

  const renderSteps = (steps, assignment) => {
    stepList.innerHTML = '';
    assignmentTitle.textContent = assignment || 'Your smaller steps';

    steps.forEach((step, index) => {
      const item = document.createElement('li');
      const checkbox = document.createElement('input');
      const label = document.createElement('label');
      const checkboxId = `breakdown-step-${index}`;

      item.className = 'step-item';
      checkbox.type = 'checkbox';
      checkbox.id = checkboxId;
      label.htmlFor = checkboxId;
      label.textContent = step;

      checkbox.addEventListener('change', updateBreakdownProgress);

      item.append(checkbox, label);
      stepList.append(item);
    });

    updateBreakdownProgress();
  };

  const breakDownAssignment = async () => {
    if (activeRequest) return;
    const assignment = assignmentInput.value.trim();
    if (!assignment || assignment.length > 4000) {
      requestStatus.textContent = 'Describe your assignment in 1–4,000 characters.';
      assignmentInput.focus();
      return;
    }
    const controller = new AbortController();
    activeRequest = controller;
    setLoading(true);
    requestStatus.textContent = 'Creating your steps…';
    const timeout = setTimeout(() => controller.abort(), 65000);
    try {
      const response = await fetch('/api/breakdown', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ assignment }),
        signal: controller.signal,
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Unable to create steps. Please try again.');
      if (!Array.isArray(data.Steps) || data.Steps.length < 6 || data.Steps.length > 12 ||
          data.Steps.some((step) => typeof step !== 'string' || !step.trim())) {
        throw new Error('The response did not contain valid steps. Please try again.');
      }
      if (activeRequest !== controller) return;
      renderSteps(data.Steps, assignment);
      requestStatus.textContent = 'Your checklist is ready.';
    } catch (error) {
      if (activeRequest !== controller) return;
      requestStatus.textContent = error.name === 'AbortError'
        ? 'The request timed out. Please try again.'
        : error instanceof TypeError || error instanceof SyntaxError
          ? 'Unable to reach the breakdown service. Please try again.'
          : error.message;
    } finally {
      clearTimeout(timeout);
      if (activeRequest === controller) {
        activeRequest = null;
        setLoading(false);
      }
    }
  };

  breakdownButton.addEventListener('click', breakDownAssignment);

  exampleButton.addEventListener('click', () => {
    assignmentInput.value = 'Complete 25 calculus questions.';
    breakDownAssignment();
  });

  clearButton.addEventListener('click', () => {
    if (activeRequest) activeRequest.abort();
    activeRequest = null;
    setLoading(false);
    requestStatus.textContent = '';
    assignmentInput.value = '';
    renderSteps([], '');
  });

  assignmentInput.addEventListener('keydown', (event) => {
    if ((event.metaKey || event.ctrlKey) && event.key === 'Enter') {
      breakDownAssignment();
    }
  });

  const sharedAssignment = new URLSearchParams(window.location.search).get('assignment');

  if (sharedAssignment) {
    assignmentInput.value = sharedAssignment;
  }

  renderSteps([], '');
}

const distractionTracker = document.querySelector('.tracker-layout');

if (distractionTracker) {
  const quickButtons = distractionTracker.querySelectorAll('[data-distraction]');
  const customInput = document.querySelector('#custom-distraction');
  const daySelect = document.querySelector('#distraction-day');
  const timeSelect = document.querySelector('#distraction-time');
  const durationSelect = document.querySelector('#distraction-duration');
  const logButton = document.querySelector('#log-distraction');
  const sampleButton = document.querySelector('#load-sample-distractions');
  const clearButton = document.querySelector('#clear-distractions');
  const totalLogs = document.querySelector('#distraction-total');
  const topApp = document.querySelector('#top-distraction');
  const busiestTime = document.querySelector('#best-focus-time');
  const trendSummary = document.querySelector('#trend-summary');
  const totalAppTime = document.querySelector('#total-distraction-time');
  const logList = document.querySelector('#distraction-log');
  const appCanvas = document.querySelector('#distraction-chart');
  const timeCanvas = document.querySelector('#focus-time-chart');
  const weeklyCanvas = document.querySelector('#weekly-trend-chart');
  const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
  const times = ['Morning', 'Afternoon', 'Evening'];
  const trackerStorageKey = 'adhdStudentAppUsage';

  let selectedApp = 'TikTok';
  let logs = [];

  const sampleLogs = [
    { name: 'TikTok', day: 'Monday', time: 'Evening', duration: 90 },
    { name: 'YouTube', day: 'Monday', time: 'Afternoon', duration: 60 },
    { name: 'Discord', day: 'Tuesday', time: 'Evening', duration: 30 },
    { name: 'Instagram', day: 'Wednesday', time: 'Morning', duration: 30 },
    { name: 'TikTok', day: 'Wednesday', time: 'Evening', duration: 120 },
    { name: 'Games', day: 'Thursday', time: 'Evening', duration: 60 },
    { name: 'YouTube', day: 'Friday', time: 'Afternoon', duration: 90 },
    { name: 'Games', day: 'Saturday', time: 'Evening', duration: 150 },
    { name: 'TikTok', day: 'Sunday', time: 'Morning', duration: 30 }
  ];

  const formatDuration = (minutes) => {
    const safeMinutes = Number(minutes) || 0;
    const hours = Math.floor(safeMinutes / 60);
    const remainder = safeMinutes % 60;
    const parts = [];

    if (hours) {
      parts.push(`${hours} ${hours === 1 ? 'hour' : 'hours'}`);
    }

    if (remainder) {
      parts.push(`${remainder} minutes`);
    }

    return parts.join(' ') || '0 minutes';
  };

  const formatShortDuration = (minutes) => {
    const safeMinutes = Number(minutes) || 0;

    if (safeMinutes < 60) {
      return `${safeMinutes}m`;
    }

    return `${Number((safeMinutes / 60).toFixed(1))}h`;
  };

  const saveLogs = () => {
    localStorage.setItem(trackerStorageKey, JSON.stringify(logs));
  };

  const sumDurationBy = (items, key) => {
    return items.reduce((totals, item) => {
      totals[item[key]] = (totals[item[key]] || 0) + (Number(item.duration) || 30);
      return totals;
    }, {});
  };

  const usageByTime = () => {
    return times.map((time) => {
      const total = logs
        .filter((log) => log.time === time)
        .reduce((sum, log) => sum + (Number(log.duration) || 30), 0);

      return { label: time, value: total };
    });
  };

  const drawEmptyChart = (canvas, message) => {
    const context = canvas.getContext('2d');
    context.clearRect(0, 0, canvas.width, canvas.height);
    context.fillStyle = '#52657f';
    context.font = '700 18px Arial';
    context.textAlign = 'center';
    context.fillText(message, canvas.width / 2, canvas.height / 2);
  };

  const drawBarChart = (canvas, data, maxValue, valueFormatter = (value) => value) => {
    const context = canvas.getContext('2d');
    const padding = 44;
    const chartWidth = canvas.width - padding * 2;
    const chartHeight = canvas.height - padding * 2;
    const barGap = 14;
    const barWidth = data.length ? (chartWidth - barGap * (data.length - 1)) / data.length : 0;

    context.clearRect(0, 0, canvas.width, canvas.height);
    context.strokeStyle = 'rgba(10, 42, 94, 0.18)';
    context.lineWidth = 2;
    context.beginPath();
    context.moveTo(padding, padding);
    context.lineTo(padding, canvas.height - padding);
    context.lineTo(canvas.width - padding, canvas.height - padding);
    context.stroke();

    data.forEach((item, index) => {
      const height = maxValue ? (item.value / maxValue) * chartHeight : 0;
      const x = padding + index * (barWidth + barGap);
      const y = canvas.height - padding - height;

      context.fillStyle = '#0a2a5e';
      context.fillRect(x, y, barWidth, height);
      context.fillStyle = '#10233f';
      context.font = '800 14px Arial';
      context.textAlign = 'center';
      context.fillText(valueFormatter(item.value), x + barWidth / 2, y - 8);
      context.fillStyle = '#52657f';
      context.font = '700 12px Arial';
      context.fillText(item.label, x + barWidth / 2, canvas.height - 16);
    });
  };

  const drawLineChart = (canvas, data, maxValue, valueFormatter = (value) => value) => {
    const context = canvas.getContext('2d');
    const padding = 44;
    const chartWidth = canvas.width - padding * 2;
    const chartHeight = canvas.height - padding * 2;
    const stepX = data.length > 1 ? chartWidth / (data.length - 1) : chartWidth;

    context.clearRect(0, 0, canvas.width, canvas.height);
    context.strokeStyle = 'rgba(10, 42, 94, 0.18)';
    context.lineWidth = 2;
    context.beginPath();
    context.moveTo(padding, padding);
    context.lineTo(padding, canvas.height - padding);
    context.lineTo(canvas.width - padding, canvas.height - padding);
    context.stroke();

    context.strokeStyle = '#0a2a5e';
    context.lineWidth = 4;
    context.beginPath();

    data.forEach((item, index) => {
      const x = padding + index * stepX;
      const y = canvas.height - padding - (maxValue ? (item.value / maxValue) * chartHeight : 0);

      if (index === 0) {
        context.moveTo(x, y);
      } else {
        context.lineTo(x, y);
      }
    });

    context.stroke();

    data.forEach((item, index) => {
      const x = padding + index * stepX;
      const y = canvas.height - padding - (maxValue ? (item.value / maxValue) * chartHeight : 0);

      context.fillStyle = '#0a2a5e';
      context.beginPath();
      context.arc(x, y, 6, 0, Math.PI * 2);
      context.fill();
      context.fillStyle = '#10233f';
      context.font = '800 13px Arial';
      context.textAlign = 'center';
      context.fillText(valueFormatter(item.value), x, y - 12);
      context.fillStyle = '#52657f';
      context.font = '700 12px Arial';
      context.fillText(item.label.slice(0, 3), x, canvas.height - 16);
    });
  };

  const updateTracker = () => {
    const appTotals = sumDurationBy(logs, 'name');
    const commonData = Object.entries(appTotals)
      .map(([label, value]) => ({ label, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 5);
    const timeData = usageByTime();
    const weeklyData = days.map((day) => ({
      label: day,
      value: logs
        .filter((log) => log.day === day)
        .reduce((total, log) => total + (Number(log.duration) || 30), 0)
    }));
    const top = commonData[0];
    const busiest = [...timeData].sort((a, b) => b.value - a.value)[0];
    const firstHalf = weeklyData.slice(0, 3).reduce((total, item) => total + item.value, 0);
    const secondHalf = weeklyData.slice(4).reduce((total, item) => total + item.value, 0);
    const totalMinutes = logs.reduce((total, log) => total + (Number(log.duration) || 30), 0);

    totalLogs.textContent = logs.length;
    topApp.textContent = top ? `${top.label} (${formatShortDuration(top.value)})` : 'None yet';
    busiestTime.textContent = busiest?.value ? `${busiest.label} (${formatShortDuration(busiest.value)})` : 'None yet';
    totalAppTime.textContent = formatDuration(totalMinutes);
    trendSummary.textContent = logs.length
      ? secondHalf > firstHalf
        ? 'More app time later in the week'
        : secondHalf < firstHalf
          ? 'Less app time later in the week'
          : 'Steady across the week'
      : 'No trend yet';

    logList.innerHTML = '';
    logs.slice(-9).reverse().forEach((log) => {
      const item = document.createElement('li');
      const name = document.createElement('strong');
      const meta = document.createElement('span');

      name.textContent = log.name;
      meta.textContent = `${log.day} ${log.time} - ${formatDuration(log.duration || 30)}`;
      item.append(name, meta);
      logList.append(item);
    });

    if (!logs.length) {
      const empty = document.createElement('li');
      empty.innerHTML = '<strong>No app time logged yet</strong><span>Log an app or load the sample week to see charts.</span>';
      logList.append(empty);
      drawEmptyChart(appCanvas, 'No app data yet');
      drawEmptyChart(timeCanvas, 'No time-of-day data yet');
      drawEmptyChart(weeklyCanvas, 'No weekly app trend yet');
      return;
    }

    drawBarChart(appCanvas, commonData, Math.max(...commonData.map((item) => item.value)), formatShortDuration);
    drawBarChart(timeCanvas, timeData, Math.max(30, ...timeData.map((item) => item.value)), formatShortDuration);
    drawLineChart(
      weeklyCanvas,
      weeklyData,
      Math.max(30, ...weeklyData.map((item) => item.value)),
      formatShortDuration
    );
  };

  const setSelectedApp = (value) => {
    selectedApp = value;
    quickButtons.forEach((button) => {
      button.classList.toggle('active', button.dataset.distraction === value);
    });
  };

  quickButtons.forEach((button) => {
    button.addEventListener('click', () => {
      customInput.value = '';
      setSelectedApp(button.dataset.distraction);
    });
  });

  customInput.addEventListener('input', () => {
    if (customInput.value.trim()) {
      selectedApp = customInput.value.trim();
      quickButtons.forEach((button) => button.classList.remove('active'));
    }
  });

  logButton.addEventListener('click', () => {
    const name = customInput.value.trim() || selectedApp;
    logs.push({
      name,
      day: daySelect.value,
      time: timeSelect.value,
      duration: Number(durationSelect.value)
    });
    customInput.value = '';
    saveLogs();
    updateTracker();
  });

  sampleButton.addEventListener('click', () => {
    logs = sampleLogs.map((log) => ({ ...log }));
    saveLogs();
    updateTracker();
  });

  clearButton.addEventListener('click', () => {
    logs = [];
    saveLogs();
    updateTracker();
  });

  const savedLogs = JSON.parse(localStorage.getItem(trackerStorageKey) || '[]');
  logs = Array.isArray(savedLogs) ? savedLogs : [];
  updateTracker();
}
