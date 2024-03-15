/* ------------------------------------------------ */
// run

makeSchedule('alt');

/* ------------------------------------------------ */
// assigned schedule

function makeSchedule(mode = 'default') {

  let teams = [
    { 'id': 1, 'name': 'Team 1' },
    { 'id': 2, 'name': 'Team 2' },
    { 'id': 3, 'name': 'Team 3' },
    { 'id': 4, 'name': 'Team 4' },
    { 'id': 5, 'name': 'Team 5' },
    { 'id': 6, 'name': 'Team 6' },
    { 'id': 7, 'name': 'Team 7' },
    { 'id': 8, 'name': 'Team 8' },
    { 'id': 9, 'name': 'Team 9' },
    { 'id': 10, 'name': 'Team 10' },
    { 'id': 11, 'name': 'Team 11' },
    { 'id': 12, 'name': 'Team 12' },
    { 'id': 13, 'name': 'Team 13' },
    { 'id': 14, 'name': 'Team 14' }
  ];

  let matchups = createMatchups(teams);
  let schedule = createSchedule();
  let assignedScheduleRaw = assignMatchups(schedule, matchups, mode);

  let assignedSchedule = assignedScheduleRaw.map(x => {

    let team1 = teams.filter(t => t.id == x.team1)[0];
    let team2 = teams.filter(t => t.id == x.team2)[0];

    return {
      week: x.week,
      week_label: 'Week ' + x.week,
      time: convertTime(x.time, 'toStr'),
      court: x.court,
      team1_id: team1.id,
      team1_name: team1.name,
      team1_record: '0-0',
      team2_id: team2.id,
      team2_name: team2.name,
      team2_record: '0-0',
      status: 'PRE',
      winner_id: null,
    };
  });



  // clean up schedule
  // assignedSchedule.forEach(x => {
  //   // replace team id with team name in schedule
  //   let team1 = teams.filter(t => t.id == x.team1)[0].name;
  //   let team2 = teams.filter(t => t.id == x.team2)[0].name;
  //   x.team1 = team1;
  //   x.team2 = team2;

  //   x.week = 'Week ' + x.week;
  //   x.time = convertTime(x.time, 'toStr');
  // });

  console.log(assignedSchedule);

  // schedule data

  // team schedules
  let teamSchedules = [];
  for (let i = 0; i < teams.length; i++) {
    let teamId = teams[i].id;
    let teamName = teams[i].name;
    let teamSchedule = assignedSchedule.filter(x => x.team1_id == teamId || x.team2_id == teamId);
    let weeks = [...new Set(teamSchedule.map(x => x.week))];

    weeks.forEach(w => {
      let games = teamSchedule.filter(x => x.week == w);

      games.forEach((g, j) => {
        let game = {
          'team_id': teamId,
          'team_name': teamName,
          'week': w,
          'week_label': 'Week ' + w,
          'nbr': j + 1,
          'time': g.time,
          'duration': .5,
          'court': g.court,
          'opponent_id': g.team1_id == teamId ? g.team2_id : g.team1_id,
          'opponent_name': g.team1_id == teamId ? g.team2_name : g.team1_name
        };

        teamSchedules.push(game);
      });
    });
  }

  console.log(teamSchedules);

  // team summary
  let teamSummary = [];
  for (let i = 0; i < teams.length; i++) {
    let teamId = teams[i].id;
    let teamName = teams[i].name;
    let teamSchedule = teamSchedules.filter(x => x.team_id == teamId);
    let weeks = [...new Set(teamSchedule.map(x => x.week))];

    // for each team, for each week, report start time of game 1, break duration, and start time of game 2
    weeks.forEach(w => {
      let games = teamSchedule.filter(x => x.week == w);
      let game1 = games[0];
      let game1Time = game1.time;
      let breakDuration = null;
      let game2Time = null;
      if (games.length > 1) {
        let game2 = games[1];
        game2Time = game2.time;
        let game1TimeNum = convertTime(game1Time, 'toNum');
        let game1EndTimeNum = game1TimeNum + game1.duration;
        let game2TimeNum = convertTime(game2Time, 'toNum');
        breakDuration = game2TimeNum - game1EndTimeNum;
      }
      let summary = {
        'team': teamName,
        'week': w,
        'game1': game1Time,
        'breakDuration': breakDuration,
        'game2': game2Time
      };
      teamSummary.push(summary);
    });
  }

  console.log(teamSummary);

  // start and end time summary
  // from teamSummary, report statistics on possible start and end times for games
  let times = [...new Set(assignedSchedule.map(x => x.time))];
  // copy times array
  let startTimes = times.slice();
  let endTimes = times.slice();
  let weeks = [...new Set(assignedSchedule.map(x => x.week))];
  let timeSummary = [];

  weeks.forEach(w => {
    startTimes.forEach(st => {
      endTimes.forEach(et => {
        let games = teamSummary.filter(x => x.week == w && x.game1 == st && x.game2 == et);
        let instances = games.length;
        let game1EndTimeNum = convertTime(st, 'toNum') + .5;
        let game2StartTimeNum = convertTime(et, 'toNum');
        let breakDuration = game2StartTimeNum - game1EndTimeNum;
        let breakDurationSum = breakDuration * instances;

        if (breakDuration >= 0) {
          let summary = {
            'week': w,
            'game1': st,
            'game2': et,
            'breakDuration': breakDuration,
            'instances': instances,
            'breakDurationTotal': breakDurationSum,
          };
          timeSummary.push(summary);
        }
      });
    });
  });

  console.log(timeSummary);

  // rotate game2 values to be columns
  // i made a pivot table of the output where game1 values are rows and game2 values are columns, then reported instances in each cell
  // re-create pivot table in code
  let game2Values = [...new Set(timeSummary.map(x => x.game2))];
  let game1Values = [...new Set(timeSummary.map(x => x.game1))];
  let pivotTable = [];
  for (let i = 0; i < game1Values.length; i++) {
    let row = game1Values[i];
    let rowValues = timeSummary.filter(x => x.game1 == row);
    let newRow = { 'game1': row };
    for (let j = 0; j < game2Values.length; j++) {
      let col = game2Values[j];
      let cell = rowValues.filter(x => x.game2 == col);
      if (cell.length > 0) {
        let val = cell[0].instances;
        val = val == 0 ? null : val;
        newRow[col] = val;
      } else {
        newRow[col] = null;
      }
    }
    pivotTable.push(newRow);
  }



  console.log(pivotTable);



}

function toRowArray(json) {

  let headers = [];
  json.forEach((x) => {
    Object.keys(x).forEach((y) => {
      if (!headers.includes(y)) headers.push(y);
    });
  });

  let values = [headers];
  json.forEach((x) => {
    let row = [];
    headers.forEach((name, index) => {
      let val = '';
      if (x[name] != null) val = x[name];
      row[index] = val;
    });
    values.push(row);
  });

  return values;
}


/* ------------------------------------------------ */
// helper to convert time (6, 6.5, 7, etc.) to string (6:00 PM, 6:30 PM, 7:00 PM, etc.)
// or vice versa
// note: all times are PM (6:00 PM, 6:30 PM, 7:00 PM, etc.)

function convertTime(time, mode = 'toStr') {

  if (mode == 'toStr') {
    let hour = Math.floor(time);
    let minFrac = time - hour;
    if (minFrac == 0) {
      return hour + ':00 PM';
    } else {
      let min = minFrac * 60;
      min = Math.floor(min);
      minStr = min < 10 ? '0' + min : min;
      return hour + ':' + minStr + ' PM';
    }
  }

  if (mode == 'toNum') {
    let spl = time.split(':');
    let hour = parseInt(spl[0]);
    let min = parseInt(spl[1]);
    let num = hour + (min / 60);
    return num;
  }

}

/* ------------------------------------------------ */
// assign matchups to schedule

function assignMatchups(schedule, matchups, mode = 'default') {

  let weeks = [...new Set(matchups.map(x => x.week))];
  let assignedSchedule = [];

  for (let i = 0; i < weeks.length; i++) {
    let weekMatchups = matchups.filter(x => x.week == weeks[i]);
    let weekSchedule = schedule.filter(x => x.week == weeks[i]);
    let orderedMatchups = [];

    if (mode == 'default') {
      orderedMatchups = weekMatchups;
    }

    if (mode == 'alt') {
      for (let j = 0; j < weekMatchups.length; j++) {
        if (j <= 3) {
          orderedMatchups.push(weekMatchups[j]);
        } else if (j >= 7) {
          orderedMatchups.push(weekMatchups[j]);
        }
      }

      for (let j = 4; j <= 6; j++) {
        orderedMatchups.push(weekMatchups[j]);
      }
    }

    // assign matchups to schedule
    for (let j = 0; j < orderedMatchups.length; j++) {
      let matchup = orderedMatchups[j];
      let game = weekSchedule[j];
      game['team1'] = matchup.team1;
      game['team2'] = matchup.team2;
      assignedSchedule.push(game);
    }
  }

  // confirm valid schedule
  // first, assignedSchedule should have same length as matchups
  if (assignedSchedule.length != matchups.length) {
    console.log('Error: assignedSchedule length does not match matchups length');
  }

  // second, no team should be scheduled to play games at the same time on any given week
  let weekSet = [...new Set(assignedSchedule.map(x => x.week))];
  weekSet.forEach(w => {
    let weekGames = assignedSchedule.filter(x => x.week == w);
    let timeSet = [...new Set(weekGames.map(x => x.time))];
    timeSet.forEach(t => {
      let timeGames = weekGames.filter(x => x.time == t);
      let teamsPlaying = timeGames.map(x => x.team1).concat(timeGames.map(x => x.team2));
      let uniqueTeams = [...new Set(teamsPlaying)];
      if (uniqueTeams.length != teamsPlaying.length) {
        console.log('Error: teams playing at same time on week ' + w + ' at ' + t);
      }
    });
  });


  return assignedSchedule;
}

/* ------------------------------------------------ */
// create array of available week/time/court combinations

function createSchedule() {

  let courts = [1, 2];
  let times = [6, 6.5, 7, 7.5, 8, 8.5, 9];
  let weeks = [1, 2, 3, 4, 5, 6, 7, 8, 9];

  let schedule = [];
  for (let i = 0; i < weeks.length; i++) {
    for (let j = 0; j < times.length; j++) {
      for (let k = 0; k < courts.length; k++) {
        schedule.push({ 'week': weeks[i], 'time': times[j], 'court': courts[k] });
      }
    }
  }

  return schedule;
}

/* ------------------------------------------------ */
// generate array of matchups

function createMatchups(teams) {

  let numTeams = teams.length

  let r = [];
  for (let i = 0; i < numTeams / 2; i++) {
    r.push([i + 1, numTeams - i]);
  }

  let matchups = [];
  matchups.push(r);

  while (matchups.length < numTeams - 1) {
    let lastRound = matchups[matchups.length - 1];
    let newRound = [];
    for (let i = 0; i < lastRound.length; i++) {
      if (i === 0) {
        let team1 = lastRound[i][0];
        let team2 = lastRound[i + 1][1];
        newRound.push([team1, team2]);
      } else if (i === 1) {
        let team1 = lastRound[i - 1][1];
        let team2 = lastRound[i + 1][1];
        newRound.push([team1, team2]);
      } else if (i === lastRound.length - 1) {
        let team1 = lastRound[i - 1][0];
        let team2 = lastRound[i][0];
        newRound.push([team1, team2]);
      } else {
        let team1 = lastRound[i - 1][0];
        let team2 = lastRound[i + 1][1];
        newRound.push([team1, team2]);
      }
    }

    matchups.push(newRound);
  }

  // flatten matchups array
  let flatMatchups = [];
  let week = 1;
  for (let i = 0; i < matchups.length; i++) {
    for (let j = 0; j < matchups[i].length; j++) {
      flatMatchups.push({ 'week': week, 'team1': matchups[i][j][0], 'team2': matchups[i][j][1] });
    }
    if (i % 2 != 0) {
      week++;
    }
  }

  // console.log(flatMatchups);
  return flatMatchups;

}

/* ------------------------------------------------ */
// clean teams data

// rawTeams looks like this:
// [{
//   v1: '1. Diggin\' N\' Swiggin\'',
//   v2: '5. Bald & Beautiful',
//   v3: '9. Cove Club',
//   v4: ''
// },
//   {
//     v1: '2. FXB',
//     v2: '6. Pogues',
//     v3: '10. The Shit Show',
//     v4: '13. Bumpin\' Uglies'
//   },
//   {
//     v1: '3. The ZOO Crew',
//     v2: '7. Setzy Beaches',
//     v3: '11. We Showed Up',
//     v4: '14. Practice Safe Sets'
//   },
//   { v1: '4. Shia LaBumps', v2: '', v3: '12. Bid D Energy', v4: '' },
//   { v1: '8. Hoes & Hoses', v2: '', v3: '', v4: '' }]

// need to reshape into an array of objects, where each object looks like:
// {'team_id': 1, 'team_name': "Diggin\' N\' Swiggin\'"}

function cleanTeams(rawTeams) {

  let teams = [];
  rawTeams.forEach(x => {
    Object.values(x).forEach(team => {
      if (team) {
        let t = team.trim();
        let teamId = t.match(/\d+/);
        let teamName = t.replace(teamId, '')
          .replace('.', '')
          .trim();

        teams.push({
          'team_id': parseInt(teamId[0]),
          'team_name': teamName
        });
      }
    });
  });

  teams.sort((a, b) => {
    return a.team_id > b.team_id;
  })

  return teams;
}

/* ------------------------------------------------ */

function cleanData(rawSchedule) {

  /* ------------------------- */
  // reshape original paste

  let leftData = [];
  let rightData = [];
  for (let i = 0; i < rawSchedule.length; i++) {
    let row = rawSchedule[i];
    leftData.push({ 'c1': row.v1, 'c2': row.v2 });
    rightData.push({ 'c1': row.v3, 'c2': row.v4 });
  }

  let raw = leftData.concat(rightData);

  /* ------------------------- */
  // parse raw

  let data = [];

  for (let i = 0; i < raw.length; i++) {

    let c1 = raw[i].c1;
    let c2 = raw[i].c2;
    c1 = c1.trim().replace('  ', ' ');
    c2 = c2.trim().replace('  ', ' ');

    if (c1 == '' || c2 == '') {
      if (c1 == '' && c2 == '') {
        continue;
      } else {
        console.error('DataCheck: only one column is empty at index ' + i, ' - fix in source data');
      }
    }

    let c1n = c1.includes('\n');
    let c2n = c2.includes('\n');
    if (!c1n && !c2n) {
      let rec = { 'c1': c1, 'c2': c2 };
      data.push(rec);
    } else {
      let c1s = c1.split('\n').map(x => x.trim());
      let c2s = c2.split('\n').map(x => x.trim());
      if (c1s.length != 2 || c2s.length != 2) {
        console.error('DataCheck: split error at index ' + i, ' - fix in source data');
      }

      [0, 1].forEach(x => {
        let rec = { 'c1': c1s[x], 'c2': c2s[x] };
        data.push(rec);
      });
    }
  }

  /* ------------------------- */
  // generate schedule

  let week = 0;
  let clean = [];

  data.forEach((x, i) => {

    let c1 = x.c1;
    let c2 = x.c2;
    if (c1.includes('Court 1') && c2.includes('Court 2')) {
      week++;
      return;
    }

    let pmFlag1 = c1.includes('PM');
    let pmFlag2 = c2.includes('PM');
    let timeKnown = pmFlag1 && !pmFlag2;
    if (!timeKnown) {
      console.error('DataCheck: time error at index ' + i, ' - fix in source data');
      return;
    }

    let time = c1.split('PM')[0];
    time = time.replace(/\s/g, '') + ' PM';
    let matchups = [
      c1.split('PM')[1].trim(),
      c2.trim()
    ];

    matchups.forEach((m, j) => {

      let num1 = m.match(/\d+/);
      let m2 = m.replace(num1, '');
      let num2 = m2.match(/\d+/);
      let m3 = m2.replace(num2, '');
      let num3 = m3.match(/\d+/);

      if ((num3 != null) || (num1 == null) || (num2 == null)) {
        console.error('DataCheck: matchup error at index ' + i, ' - fix in source data');
        return;
      }

      let team1 = parseInt(num1[0]);
      let team2 = parseInt(num2[0]);
      let rec = {
        'week': week,
        'time': time,
        'court': j + 1,
        'team1': team1,
        'team2': team2
      };

      clean.push(rec);
    });
  });

  // add game_id
  clean.forEach((x, i) => {
    let gameId = i + 1;
    // should be length 3
    let gameIdPad = 3 - gameId.toString().length;
    let gameIdStr = '0'.repeat(gameIdPad) + gameId;


  });

  return clean;
}

/* ------------------------------------------------ */

function checkSchedule(schedule) {

  /* ------------------------- */
  // unique teams playing at once

  let weekSet = [...new Set(schedule.map(x => x.week))];
  weekSet.forEach(w => {
    let weekGames = schedule.filter(x => x.week == w);
    let timeSet = [...new Set(weekGames.map(x => x.time))];
    timeSet.forEach(t => {
      let timeGames = weekGames.filter(x => x.time == t);
      let teamsPlaying = timeGames.map(x => x.team1).concat(timeGames.map(x => x.team2));
      let uniqueTeams = [...new Set(teamsPlaying)];
      if (uniqueTeams.length != teamsPlaying.length) {
        console.error('Error: teams playing at same time on week ' + w + ' at ' + t);
      }
    });
  });

  /* ------------------------- */
  // team games review

  let teamSet = [...new Set(schedule.map(x => x.team1).concat(schedule.map(x => x.team2)))];
  teamSet.forEach(t => {
    let games = schedule.filter(x => x.team1 == t || x.team2 == t);
    let opponents = games.map(x => x.team1 == t ? x.team2 : x.team1);
    let uniqueOpponents = [...new Set(opponents)];
    if (uniqueOpponents.length != teamSet.length - 1) {
      console.error('Error: team ' + t + ' does not play every other team');
    }

    let weeks = [...new Set(games.map(x => x.week))];
    weeks.forEach(w => {
      let weekGames = games.filter(x => x.week == w);
      if (weekGames.length != 2) {
        console.error('Error: team ' + t + ' does not play exactly twice on week ' + w);
      }

      // confirm all different opponents
      let opponents = weekGames.map(x => x.team1 == t ? x.team2 : x.team1);
      let uniqueOpponents = [...new Set(opponents)];
      if (opponents.length != uniqueOpponents.length) {
        console.error('Error: team ' + t + ' plays same team more than once on week ' + w);
      }
    });
  });

  console.info('DataCheck: done');
}

/* ------------------------------------------------ */
// build schedule with additional team info, week labels, and status

