import os
import re
import argparse
import torch
from datasets import load_dataset
from transformers import AutoTokenizer, AutoModelForCausalLM
from trl import GRPOTrainer, GRPOConfig

def parse_arguments():
    parser = argparse.ArgumentParser(description="DeepSeek GRPO Training on GKE")
    parser.add_argument("--model_name_or_path", type=str, default="deepseek-ai/DeepSeek-R1-Distill-Qwen-1.5B", help="Model path")
    parser.add_argument("--dataset_path", type=str, default="/gcs/your-bucket-name/dataset", help="Dataset path (mounted GCS)")
    parser.add_argument("--output_dir", type=str, default="/gcs/your-bucket-name/checkpoints", help="Output directory for checkpoints")
    parser.add_argument("--num_epochs", type=int, default=1)
    parser.add_argument("--batch_size", type=int, default=8)
    parser.add_argument("--learning_rate", type=float, default=1e-5)
    return parser.parse_args()

# --- Reward Functions ---

def format_reward_func(prompts, completions, **kwargs):
    """
    Reward for strictly following the reasoning format:
    <think>
    Thinking process...
    </think>
    <answer>
    Final Answer
    </answer>
    """
    rewards = []
    pattern = r"<think>.*?</think>\s*<answer>.*?</answer>"
    
    for completion in completions:
        # TRL provides string completion
        if isinstance(completion, list):
             text = completion[0]['content'] # if conversation format
        else:
             text = completion
             
        if re.search(pattern, text, re.DOTALL):
            rewards.append(1.0)
        else:
            rewards.append(0.0)
            
    return rewards

def length_reward_func(completions, **kwargs):
    """
    Penalize extremely long completions to encourage concise thinking.
    """
    rewards = []
    for completion in completions:
        text = completion[0]['content'] if isinstance(completion, list) else completion
        length = len(text)
        if length > 2048:
             rewards.append(-0.5)
        elif length < 100:
             rewards.append(-0.2) # too short
        else:
             rewards.append(0.5)
             
    return rewards

# --- Main Training Loop ---

def main():
    args = parse_arguments()
    print(f"Loading model: {args.model_name_or_path}")
    
    # Enable Hugging Face login if using gated models
    # if os.environ.get("HF_TOKEN"):
    #     from huggingface_hub import login
    #     login(token=os.environ.get("HF_TOKEN"))

    tokenizer = AutoTokenizer.from_pretrained(args.model_name_or_path)
    tokenizer.pad_token = tokenizer.eos_token

    # Load dataset from mounted GCS path
    # Typically, datasets uploaded to GCS as json/parquet
    try:
        if os.path.isdir(args.dataset_path):
             dataset = load_dataset("json", data_dir=args.dataset_path, split="train")
        else:
             dataset = load_dataset("json", data_files=args.dataset_path, split="train")
    except Exception as e:
        print(f"Failed to load dataset from {args.dataset_path}: {e}")
        print("Falling back to standard GSM8K from HuggingFace for demonstration")
        dataset = load_dataset("openai/gsm8k", "main", split="train")
        # Format dataset to match what GRPO expects (prompt list)
        dataset = dataset.map(lambda x: {"prompt": x["question"]})

    # Configure GRPO 
    # vLLM is highly recommended as a rollout generator backend for GRPO
    training_args = GRPOConfig(
        output_dir=args.output_dir,
        num_train_epochs=args.num_epochs,
        per_device_train_batch_size=args.batch_size,
        learning_rate=args.learning_rate,
        remove_unused_columns=False,
        save_strategy="steps",
        save_steps=500,
        # GRPO Parameters
        num_generations=4, # Number of Rollouts per prompt
        max_prompt_length=512,
        max_completion_length=1024,
        # vLLM configuration
        use_vllm=True,
        vllm_backend="vllm", # Use vLLM for rollout generation
        # Distributed Training / deepspeed setting
        # deepspeed="ds_config.json" # add deepspeed config if scaling
    )

    trainer = GRPOTrainer(
        model=args.model_name_or_path, # model id or path
        reward_funcs=[format_reward_func, length_reward_func],
        args=training_args,
        train_dataset=dataset,
        # Default policy and reference model setup handled by GRPOTrainer
    )

    print("Starting Training...")
    trainer.train()
    
    print(f"Saving final model to {args.output_dir}")
    trainer.save_model(args.output_dir)

if __name__ == "__main__":
    main()
