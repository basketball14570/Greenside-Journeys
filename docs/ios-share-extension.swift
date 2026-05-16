//
//  ShareViewController.swift
//  GreensideShare
//
//  Drop this into the Share Extension target after `npx cap add ios`
//  generates the Xcode project. Companion docs in docs/mobile.md.
//
//  The extension activates on plain text, URLs, and images. It builds a
//  greenside://share?... URL with the payload as query params, opens the
//  main app, and dismisses. The main app forwards the URL to
//  /dashboard/upload/share which feeds the existing parser.
//
//  Replace `com.greensidejourneys.app` with the actual main-app bundle
//  identifier if it differs.

import UIKit
import Social
import MobileCoreServices
import UniformTypeIdentifiers

class ShareViewController: UIViewController {

    override func viewDidLoad() {
        super.viewDidLoad()
        view.backgroundColor = UIColor(red: 0.04, green: 0.12, blue: 0.08, alpha: 1.0)
        handleSharedContent()
    }

    private func handleSharedContent() {
        guard
            let items = extensionContext?.inputItems as? [NSExtensionItem],
            let item = items.first,
            let providers = item.attachments
        else {
            close()
            return
        }

        let group = DispatchGroup()
        var collected = ShareCollected()

        for provider in providers {
            // Plain text
            if provider.hasItemConformingToTypeIdentifier(UTType.plainText.identifier) {
                group.enter()
                provider.loadItem(forTypeIdentifier: UTType.plainText.identifier, options: nil) { data, _ in
                    if let s = data as? String { collected.text = s }
                    group.leave()
                }
            }
            // URLs
            if provider.hasItemConformingToTypeIdentifier(UTType.url.identifier) {
                group.enter()
                provider.loadItem(forTypeIdentifier: UTType.url.identifier, options: nil) { data, _ in
                    if let url = data as? URL { collected.url = url.absoluteString }
                    group.leave()
                }
            }
            // Images — we don't ship the bytes through the URL scheme; we
            // upload them via App Group and pass a token. Wire up an App
            // Group between the share extension and the main app, write
            // the image to the group container, then pass its filename.
            if provider.hasItemConformingToTypeIdentifier(UTType.image.identifier) {
                group.enter()
                provider.loadItem(forTypeIdentifier: UTType.image.identifier, options: nil) { data, _ in
                    if
                        let image = data as? UIImage,
                        let jpeg = image.jpegData(compressionQuality: 0.82),
                        let appGroupURL = FileManager.default.containerURL(
                            forSecurityApplicationGroupIdentifier: "group.com.greensidejourneys.shared"
                        )
                    {
                        let filename = "share-\(Date().timeIntervalSince1970).jpg"
                        let fileURL = appGroupURL.appendingPathComponent(filename)
                        try? jpeg.write(to: fileURL)
                        collected.imageToken = filename
                    }
                    group.leave()
                }
            }
        }

        group.notify(queue: .main) { [weak self] in
            self?.openMainApp(with: collected)
        }
    }

    private func openMainApp(with payload: ShareCollected) {
        var components = URLComponents()
        components.scheme = "greenside"
        components.host = "share"
        components.queryItems = payload.queryItems()
        guard let url = components.url else {
            close()
            return
        }
        // Walk the responder chain to find the openURL: selector. Apple
        // forbids share extensions from calling UIApplication.shared
        // directly, so we hop responders.
        var responder: UIResponder? = self
        let selector = sel_registerName("openURL:")
        while let r = responder {
            if r.responds(to: selector) {
                _ = r.perform(selector, with: url)
                break
            }
            responder = r.next
        }
        close()
    }

    private func close() {
        extensionContext?.completeRequest(returningItems: nil, completionHandler: nil)
    }
}

private struct ShareCollected {
    var text: String?
    var url: String?
    var imageToken: String?

    func queryItems() -> [URLQueryItem] {
        var items: [URLQueryItem] = []
        if let t = text { items.append(URLQueryItem(name: "text", value: t)) }
        if let u = url { items.append(URLQueryItem(name: "url", value: u)) }
        if let img = imageToken { items.append(URLQueryItem(name: "image", value: img)) }
        return items
    }
}

//
// MAIN APP — in your AppDelegate or SceneDelegate:
//
// func scene(_ scene: UIScene, openURLContexts URLContexts: Set<UIOpenURLContext>) {
//     guard let url = URLContexts.first?.url, url.scheme == "greenside" else { return }
//     // Forward to the embedded WKWebView. With Capacitor:
//     CAPBridge.handleOpenUrl(url)
//     // The web layer's deep-link handler then routes to /dashboard/upload/share.
// }
//
// Don't forget Info.plist:
//   - CFBundleURLTypes with scheme "greenside"
//   - NSExtensionActivationRule (plain text, URLs, images, max counts)
//   - App Group entitlement on both the main app and the extension.
