import React, { useEffect, useState } from "react"
import ReactDOM from "react-dom"
import { Box, Grid, InputBase, IconButton, TextField } from "@material-ui/core"
import { Add as AddIcon } from "@material-ui/icons"
import "./popup.css"
import { getDatabase, getPages, addItem } from "../utils/api"
import getDateString from "../utils/helpers"

const App: React.FC<{}> = () => {
	const [noteInput, setNoteInput] = useState<string>("")
	const [error, setError] = useState<string | null>(null)
	const [loading, setLoading] = useState<boolean>(false)

	const handleButtonClick = () => {
		setError(null)
		setLoading(true)
		let data = [noteInput, getDateString()]

		chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
			if (!tabs || !tabs[0] || !tabs[0].id) {
				setError("Cannot get current tab information")
				setLoading(false)
				return
			}

			try {
				chrome.tabs.sendMessage(
					tabs[0].id,
					"ask for lc title from pop",
					(problemData) => {
						// Check for Chrome extension API errors
						if (chrome.runtime.lastError) {
							console.error("Chrome extension error:", chrome.runtime.lastError)
							setError(`Failed to get problem info: ${chrome.runtime.lastError.message}`)
							setLoading(false)
							return
						}

						// Check if problemData is valid
						if (!problemData || !Array.isArray(problemData) || problemData.length < 3) {
							setError("Invalid problem data received")
							setLoading(false)
							return
						}

						console.log("Successfully received problem data:", problemData)
						data = [...problemData, ...data]
						console.log("Complete data:", data)

						// Add to Notion
						addItem(data)
							.catch(err => {
								console.error("Failed to add to Notion:", err)
								// Display more detailed error information
								const errorMessage = err.message || "Failed to add to Notion";
								setError(errorMessage);
							})
							.finally(() => {
								setLoading(false)
							})
					}
				)
			} catch (err) {
				console.error("Error sending message:", err)
				setError("Failed to send message to content script")
				setLoading(false)
			}
		})
	}

	return (
		<Box
			mx="8px"
			my="16px"
		>
			<TextField
				style={{ width: 270 }}
				placeholder="Add notes..."
				value={noteInput}
				onChange={(event) => setNoteInput(event.target.value)}
				disabled={loading}
			/>
			<IconButton
				size="small"
				onClick={handleButtonClick}
				disabled={loading}
			>
				<AddIcon />
			</IconButton>

			{error && (
				<Box color="error.main" mt={1} fontSize="0.8rem">
					Error: {error}
				</Box>
			)}

			{loading && (
				<Box mt={1} fontSize="0.8rem">
					Processing...
				</Box>
			)}
		</Box>
	)
}

const root = document.createElement("div")
document.body.appendChild(root)
// Use React 17 compatible rendering method
ReactDOM.render(<App />, root)