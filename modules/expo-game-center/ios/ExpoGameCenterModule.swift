import ExpoModulesCore
import GameKit
import UIKit

public class ExpoGameCenterModule: Module {
  // The authenticateHandler is long-lived and can fire repeatedly. Never capture
  // a single Promise inside it (resolving twice crashes). Instead we park all
  // pending promises here and settle+clear them whenever the handler fires.
  private var pendingAuth: [Promise] = []
  private var authHandlerInstalled = false

  public func definition() -> ModuleDefinition {
    Name("ExpoGameCenter")

    AsyncFunction("authenticate") { (promise: Promise) in
      DispatchQueue.main.async {
        let local = GKLocalPlayer.local
        if local.isAuthenticated {
          promise.resolve(true)
          return
        }
        self.pendingAuth.append(promise)
        if self.authHandlerInstalled { return }
        self.authHandlerInstalled = true

        local.authenticateHandler = { viewController, error in
          DispatchQueue.main.async {
            if let vc = viewController {
              self.topViewController()?.present(vc, animated: true)
              return // handler will fire again once the user finishes
            }
            let authed = GKLocalPlayer.local.isAuthenticated
            let waiting = self.pendingAuth
            self.pendingAuth.removeAll()
            for p in waiting { p.resolve(authed) }
          }
        }
      }
    }

    AsyncFunction("isAuthenticated") { () -> Bool in
      return GKLocalPlayer.local.isAuthenticated
    }

    AsyncFunction("submitScore") { (score: Int, leaderboardID: String, promise: Promise) in
      guard GKLocalPlayer.local.isAuthenticated else { promise.resolve(false); return }
      GKLeaderboard.submitScore(
        score, context: 0, player: GKLocalPlayer.local, leaderboardIDs: [leaderboardID]
      ) { error in
        promise.resolve(error == nil)
      }
    }

    AsyncFunction("presentLeaderboard") { (leaderboardID: String, promise: Promise) in
      DispatchQueue.main.async {
        let vc = GKGameCenterViewController(
          leaderboardID: leaderboardID, playerScope: .global, timeScope: .allTime
        )
        let delegate = GCDelegate()
        vc.gameCenterDelegate = delegate
        ExpoGameCenterModule.retainedDelegate = delegate
        if let top = self.topViewController() {
          top.present(vc, animated: true) { promise.resolve(true) }
        } else {
          promise.resolve(false)
        }
      }
    }

    AsyncFunction("loadTopScores") { (leaderboardID: String, count: Int, promise: Promise) in
      guard GKLocalPlayer.local.isAuthenticated else { promise.resolve([]); return }
      GKLeaderboard.loadLeaderboards(IDs: [leaderboardID]) { boards, error in
        guard let board = boards?.first, error == nil else { promise.resolve([]); return }
        let range = NSRange(location: 1, length: max(1, min(count, 100)))
        board.loadEntries(for: .global, timeScope: .allTime, range: range) { localEntry, entries, _, err in
          if err != nil { promise.resolve([]); return }
          var rows: [[String: Any]] = []
          for e in entries ?? [] {
            rows.append([
              "rank": e.rank,
              "name": e.player.displayName,
              "score": e.score,
              "me": e.player == GKLocalPlayer.local,
            ])
          }
          if let me = localEntry {
            rows.append([
              "rank": me.rank, "name": "You", "score": me.score, "me": true,
            ])
          }
          promise.resolve(rows)
        }
      }
    }
  }

  private func topViewController() -> UIViewController? {
    let scenes = UIApplication.shared.connectedScenes
    let windowScene = scenes.first { $0.activationState == .foregroundActive } as? UIWindowScene
    var root = windowScene?.windows.first(where: { $0.isKeyWindow })?.rootViewController
    while let presented = root?.presentedViewController { root = presented }
    return root
  }

  // keep the GC view-controller delegate alive while presented
  static var retainedDelegate: GCDelegate?
}

class GCDelegate: NSObject, GKGameCenterControllerDelegate {
  func gameCenterViewControllerDidFinish(_ gameCenterViewController: GKGameCenterViewController) {
    gameCenterViewController.dismiss(animated: true)
    ExpoGameCenterModule.retainedDelegate = nil
  }
}
