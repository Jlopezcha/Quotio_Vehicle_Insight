Prerequisites to run RAG locally 
- Python 3+
- MongoDb local or cloud instance
- Groq API key (free version put into env file as GROQ_API_KEY)
- Tavily API key (free version put into env file as TAVILY_API_KEY)


Inside project root directory - Seed local database use 
    
    npm run ragseed 


---------------------------------------------------

### IMPORTANT Navigate to rag_ai_service directory - from root cd src/rag_ai_service
	
    *Highly recommended to setup venv python virtual environment to not interfere with python dependencies on your local machine*

    Windows setup  venv		
        python -m venv venv 

    Windows (powershell) Activate venv
        venv\Scripts\activate

    MacOS setup venv
        python3 -m venv venv
    
    MacOS Activate venv 
        source venv/bin/activate



Check venv is active - if properly done (venv) will show next to the terminal/command prompt 

Once venv is active download requirements.txt using 

	python -m pip install -r requirements.txt

*Downloading requirements.txt will take some time up to or more than 10 mins. It only needs to be done once*

After requirements are installed succesfully, to start python RAG server use 

	python -m uvicorn main_rag:app --port 9000

------------------------------------
### NOTE  venv only needs to be active for one terminal which is where uvicorn is called. npm run server and npm run dev should be ran on the root directory without venv. 

Groq has strict limits if receiving 500 error you can try using another API key through another account - Reliability page causes limit to be reached fast, avoid making too many requests in quick succession

### To disable venv  
    deactivate 