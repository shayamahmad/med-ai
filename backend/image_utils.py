import torch 
import torchvision.transforms as T 
import numpy as np
from PIL import Image
import io 




standard_transform = T.Compose([
    T.Resize((224, 224)),
    T.ToTensor(),
    T.Normalize(mean=[0.485, 0.456, 0.406], 
                std=[0.229, 0.224, 0.225])
])

skin_transform = T.Compose([
    T.Resize((224, 224)),
    T.ToTensor(),
    T.Normalize(mean=[0.7630,0.5456,0.5700],
                std=[0.1409,0.1526,0.1697])
])


transform_map = {
    "organ": standard_transform,
    "chest": standard_transform,
    "brain": standard_transform,
    "skin":  skin_transform,
    "eye":   standard_transform,
    "bone":  standard_transform,
    "knee":  standard_transform,
    "dental": standard_transform,
}



def load_image(file_bytes: bytes) -> Image.Image:
    """Load image from raw bytes and convert to RGB."""
    image = Image.open(io.BytesIO(file_bytes))
    return image.convert("RGB")


def preprocess_image(image: Image.Image, model_key: str ="organ") -> torch.Tensor:
    """
    Apply the correct transform for the given model key.
    Returns a [1, 3, 224, 224] tensor.
    """
    transform = transform_map.get(model_key, standard_transform)
    tensor = transform(image)
    return transform(image).unsqueeze(0)  # Add batch dimension

def preprocess_bytes(file_bytes: bytes, model_key: str ="organ") -> torch.Tensor:
    """Convenience: bytes -> preprocessed tensor."""
    image = load_image(file_bytes)
    return preprocess_image(image, model_key)


def run_inference( model, tensor: torch.Tensor,labels: list, device, top_k:int = 3)-> dict:
     """
    Run model inference and return top-k predictions with confidence scores.
 
    Returns:
        {
            "prediction": "ClassName",
            "confidence": 0.97,
            "top_k": [
                {"label": "ClassName", "confidence": 0.97},
                ...
            ]
        }
    """
     
     tensor = tensor.to(device)
     with torch.no_grad():
         logits = model(tensor)
         probs = torch.softmax(logits, dim=1)[0]


         top_k = min(top_k, len(labels))
         values, indices = torch.topk(probs, top_k)


         top_results =[
             {"label": labels[i],"confidence": round(float(v), 4)}
             for v,i in zip(values, indices)
         ]

         return{
             "prediction": top_results[0]["label"],
             "confidence": top_results[0]["confidence"],
             "top_k": top_results
         }
     

def image_to_base64(image: Image.Image, fmt: str = "PNG") -> str:
    """Convert PIL image to base64 string for JSON responses."""
    import base64
    buf = io.BytesIO()
    image.save(buf, format=fmt)
    return base64.b64encode(buf.getvalue()).decode("utf-8")


def tensor_to_pil(tensor: torch.Tensor) -> Image.Image:
    """Convert a [C,H,W] or [1,C,H,W] tensor to PIL image (unnormalized)."""
    if tensor.dim() == 4:
        tensor = tensor.squeeze(0)
    arr = tensor.permute(1, 2, 0).cpu().numpy()
    arr = np.clip(arr * 255, 0, 255).astype(np.uint8)
    return Image.fromarray(arr)