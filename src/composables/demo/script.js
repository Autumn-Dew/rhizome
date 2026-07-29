import { SPLASH_HOLD, SPLASH_EXIT } from './engine'

export async function playDemo(e) {
  let song = null

  // 开屏展示
  await e.splash()

  // 进入本地音乐 → 立刻播放
  await e.route('/player/local')
  song = e.playFirstSong()
  await e.sleep()

  // 调整视图：专辑 → 艺人 → 文件夹
  await e.cycleLocalViews()

  // 进入详情页，字幕「播放」，最大化
  e.caption('播放')
  await e.route('/player/detail', 0)
  e.maximizeWindow()

  // 停顿 7s，下一首
  await e.sleep(7000)
  e.nextSong()
  await e.sleep(5000)

  // 切换主题 → 停顿 7s → 桌面歌词
  e.flipTheme()
  await e.sleep(7000)
  e.showDesktopLyrics()

  // 停顿 5s → 锁定歌词 → 切换主题
  await e.sleep(5000)
  e.lockDesktopLyrics(true)
  e.flipTheme()
  await e.sleep(5000)

  // 退出详情，回到本地音乐
  await e.route('/player/local')

  // 收藏第一首歌 + 字幕「歌单」
  e.setFavorite(song?.path, true)
  e.caption('歌单')
  await e.sleep()

  // → 歌单页
  await e.route('/player/playlist')

  // 停顿 2s → 点击第一个歌单进入详情
  await e.sleep()
  e.tap('.playlist-cover', 0)
  await e.sleep()

  // 停顿 → 取消收藏 → 延迟 1s → 返回歌单页
  await e.sleep()
  e.setFavorite(song?.path, false)
  await e.sleep(1000)
  await e.route('/player/playlist')

  // 字幕「播放记录」
  e.caption('播放记录')
  await e.sleep()

  // 播放历史 → 停顿 → 日记
  await e.route('/player/history')
  await e.sleep()
  await e.route('/player/diary')

  // 返回历史 → 时间线
  await e.route('/player/history')
  await e.route('/player/timeline')

  // 返回历史 → 听歌统计
  await e.route('/player/history')
  await e.route('/player/stats')

  // 停顿 → 设置页 → 字幕「设置」→ 切换选项卡
  await e.sleep()
  e.caption('设置')
  await e.route('/player/settings')
  await e.cycleSettingsTabs()

  // 关闭桌面歌词 → 返回本地音乐
  e.hideDesktopLyrics()
  await e.route('/player/local', 0)
  e.ui.masked.value = true
  e.ui.splashVisible.value = true
  await e.sleep(SPLASH_HOLD)

  // 感谢观看（时长 4s）
  e.caption('感谢观看', 4000)
  await e.sleep(4500)

  // 关闭
  e.tap('.ss-root')
  await e.sleep(SPLASH_EXIT)
  e.ui.splashVisible.value = false
  e.hideCaption()
  e.ui.masked.value = false
}
