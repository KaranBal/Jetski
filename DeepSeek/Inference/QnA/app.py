import streamlit as st
import torch
from transformers import AutoTokenizer, AutoModelForCausalLM, TextIteratorStreamer
from threading import Thread

# --- Page Setup ---
st.set_page_config(
    page_title="DeepSeek Q&A Local Node",
    page_icon="🤖",
    layout="centered"
)

# --- Define Model Helper ---
MODEL_ID = "deepseek-ai/DeepSeek-R1-Distill-Qwen-1.5B"

@st.cache_resource
def load_model_and_tokenizer():
    """Loads the model and tokenizer onto the best available device once per session."""
    # Detect acceleration device: Apple Silicon (mps), Nvidia (cuda), fallback (cpu)
    device = "mps" if torch.backends.mps.is_available() else "cuda" if torch.cuda.is_available() else "cpu"
    
    st.sidebar.info(f"Loading Model model onto device: **{device.upper()}**")
    
    tokenizer = AutoTokenizer.from_pretrained(MODEL_ID)
    model = AutoModelForCausalLM.from_pretrained(
        MODEL_ID,
        torch_dtype=torch.float16 if device != "cpu" else torch.float32,
        device_map="auto" if device != "cpu" else None
    )
    
    if device == "cpu":
        model = model.to("cpu")
        
    return tokenizer, model, device

# Boot loading
try:
    tokenizer, model, device = load_model_and_tokenizer()
    st.sidebar.success("✅ Model Ready for inference.")
except Exception as e:
    st.sidebar.error(f"❌ Error loading model weights: {e}")
    st.stop()

# --- Chat Session Memory Memory ---
if "messages" not in st.session_state:
    st.session_state.messages = []

st.title("🤖 DeepSeek Q&A Local")
st.markdown("Ask a question below. The Distill 1.5B model runs fully on your local machine.")

# Render previous dialogue arrays
for message in st.session_state.messages:
    with st.chat_message(message["role"]):
        st.markdown(message["content"])

# --- Handle User Prompt ---
if prompt := st.chat_input("What is the capital of France?"):
    # 1. Display User Message
    st.session_state.messages.append({"role": "user", "content": prompt})
    with st.chat_message("user"):
        st.markdown(prompt)

    # 2. Display Assistant Stream Placeholder
    with st.chat_message("assistant"):
        response_placeholder = st.empty()
        full_response = ""

        # Setup Light Prompt wrapping template context
        input_text = f"User: {prompt}\nAssistant:"
        inputs = tokenizer(input_text, return_tensors="pt").to(device)

        # Setup streaming iterator handler
        streamer = TextIteratorStreamer(tokenizer, skip_prompt=True, skip_special_tokens=True)
        
        # Define response Thread trigger to avoiding blocking server GUI frame buffers
        generation_kwargs = dict(
            **inputs,
            streamer=streamer,
            max_new_tokens=400,
            temperature=0.6,
            top_p=0.9
        )
        
        thread = Thread(target=model.generate, kwargs=generation_kwargs)
        thread.start()

        # Stream the output
        for new_text in streamer:
            full_response += new_text
            response_placeholder.markdown(full_response + "▌")
            
        response_placeholder.markdown(full_response)
        
    st.session_state.messages.append({"role": "assistant", "content": full_response})
