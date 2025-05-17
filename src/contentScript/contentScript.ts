// LeetCode selectors, based on 2025 website structure
const PROBLEM_NAME_SELECTORS = [".mr-2", "h4", ".text-title-large"]
const DIFFICULTY_SELECTORS = [
	".mt-3 div span",  // Legacy selector
	"[role='difficulty']",  // Possible new role attribute
	".difficulty-pill"  // Possible difficulty label class
]

/**
 * Extract problem slug from URL
 */
function extractSlugFromUrl(url: string): string | null {
	const match = url.match(/\/problems\/([^\/]+)/)
	return match ? match[1] : null
}

/**
 * Fetch problem metadata using LeetCode's GraphQL API
 */
async function getQuestionMeta(slug: string) {
	const body = {
		query: `
      query ($titleSlug: String!) {
        question(titleSlug: $titleSlug) {
          difficulty
          questionId
          title
          likes
          dislikes
        }
      }`,
		variables: { titleSlug: slug },
	}

	try {
		const res = await fetch("https://leetcode.com/graphql", {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
			},
			body: JSON.stringify(body),
		})

		const { data } = await res.json()
		return data?.question
	} catch (error) {
		console.error("Error fetching from LeetCode GraphQL:", error)
		return null
	}
}

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
	// Process using async function
	(async () => {
		try {
			// Get slug from URL
			const slug = extractSlugFromUrl(window.location.href)
			let title = ""
			let difficulty = "Unknown"

			// If slug exists, try using GraphQL API
			if (slug) {
				const meta = await getQuestionMeta(slug)
				if (meta) {
					title = meta.title
					difficulty = meta.difficulty
					const link = window.location.href

					console.log("LeetCode2Notion extracted (API):", { title, link, difficulty })
					sendResponse([title, link, difficulty])
					return
				}
			}

			// Fallback to DOM parsing method
			// Try multiple possible problem name selectors
			let titleElement = null
			for (const selector of PROBLEM_NAME_SELECTORS) {
				titleElement = document.querySelector(selector)
				if (titleElement) break
			}

			// Try multiple possible difficulty selectors
			let difficultyElement = null
			for (const selector of DIFFICULTY_SELECTORS) {
				const elements = document.querySelectorAll(selector)
				for (const el of elements) {
					// Check if text content contains difficulty keywords
					const text = el.textContent?.toLowerCase() || ""
					if (text.includes("easy") || text.includes("medium") || text.includes("hard")) {
						difficultyElement = el
						break
					}
				}
				if (difficultyElement) break
			}

			// If problem name not found, try parsing from URL
			title = titleElement?.textContent?.trim() || ""
			if (!title && slug) {
				title = slug.split("-").map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(" ")
			}

			const link = window.location.href

			// Parse difficulty
			if (difficultyElement) {
				difficulty = difficultyElement.textContent?.trim() || "Unknown"
			}

			console.log("LeetCode2Notion extracted (DOM):", { title, link, difficulty })
			sendResponse([title, link, difficulty])
		} catch (error) {
			console.error("Error in LeetCode extension:", error)
			sendResponse({ error: error.message })
		}
	})()

	// Return true to indicate async response handling
	return true
})