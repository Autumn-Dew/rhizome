// 在浏览器控制台粘贴运行此脚本，注入模拟播放历史数据
(function() {
  const now = Date.now()
  const DAY = 86400000
  
  const mockSongs = [
    { path: '/music/bohemian-rhapsody.mp3', name: 'Bohemian Rhapsody', singer: 'Queen', album: 'A Night at the Opera', coverUrl: '', duration: 354 },
    { path: '/music/hotel-california.mp3', name: 'Hotel California', singer: 'Eagles', album: 'Hotel California', coverUrl: '', duration: 391 },
    { path: '/music/stairway-to-heaven.mp3', name: 'Stairway to Heaven', singer: 'Led Zeppelin', album: 'Led Zeppelin IV', coverUrl: '', duration: 482 },
    { path: '/music/imagine.mp3', name: 'Imagine', singer: 'John Lennon', album: 'Imagine', coverUrl: '', duration: 183 },
    { path: '/music/smells-like-teen-spirit.mp3', name: 'Smells Like Teen Spirit', singer: 'Nirvana', album: 'Nevermind', coverUrl: '', duration: 301 },
    { path: '/music/billie-jean.mp3', name: 'Billie Jean', singer: 'Michael Jackson', album: 'Thriller', coverUrl: '', duration: 294 },
    { path: '/music/lose-yourself.mp3', name: 'Lose Yourself', singer: 'Eminem', album: '8 Mile', coverUrl: '', duration: 326 },
    { path: '/music/rolling-in-the-deep.mp3', name: 'Rolling in the Deep', singer: 'Adele', album: '21', coverUrl: '', duration: 228 },
    { path: '/music/shape-of-you.mp3', name: 'Shape of You', singer: 'Ed Sheeran', album: '÷', coverUrl: '', duration: 233 },
    { path: '/music/blinding-lights.mp3', name: 'Blinding Lights', singer: 'The Weeknd', album: 'After Hours', coverUrl: '', duration: 200 },
    { path: '/music/despacito.mp3', name: 'Despacito', singer: 'Luis Fonsi', album: 'Vida', coverUrl: '', duration: 229 },
    { path: '/music/uptown-funk.mp3', name: 'Uptown Funk', singer: 'Mark Ronson ft. Bruno Mars', album: 'Uptown Special', coverUrl: '', duration: 270 },
  ]

  // 生成过去 30 天的播放记录
  const history = []
  const countMap = {}
  
  for (let day = 0; day < 30; day++) {
    const dayStart = now - day * DAY
    // 每天 5-25 首
    const songsToday = 5 + Math.floor(Math.random() * 20)
    for (let i = 0; i < songsToday; i++) {
      const song = mockSongs[Math.floor(Math.random() * mockSongs.length)]
      // 随机分布在 8:00 - 凌晨 2:00
      const hour = 8 + Math.floor(Math.random() * 18)
      const minute = Math.floor(Math.random() * 60)
      const playAt = dayStart - (hour * 3600 + minute * 60) * 1000
      history.push({ path: song.path, playAt, duration: song.duration })
      countMap[song.path] = (countMap[song.path] || 0) + 1
    }
  }

  localStorage.setItem('playHistoryFull', JSON.stringify(history))
  localStorage.setItem('playCountReal', JSON.stringify(countMap))
  
  // 将 mock 歌曲注入 localMusicStore 的缓存
  localStorage.setItem('rhizome-song-cache', JSON.stringify(mockSongs))
  localStorage.setItem('local-music-list', JSON.stringify(mockSongs.map(s => s.path)))

  console.log(`✅ 注入了 ${history.length} 条播放记录，覆盖 ${Object.keys(countMap).length} 首歌`)
  console.log('刷新应用后进入「播放历史 → 日记」查看效果')
})()
