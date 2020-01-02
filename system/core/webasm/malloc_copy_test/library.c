#include "common_header.h"

char* malloc_copy(char* input)
{   
    usize len = strlen(input) + 1;

    char* result = (char*)malloc(len);
    if (result == NULL) {
        return NULL;
    }

    strncpy(result, input, len);

    return result;
}

void malloc_free(char* input)
{
    free(input);
}

float32 print_num(float val);

float32 my_sin(float32 val) 
{   
    float32 result = sinf(val);

    float32 result_times_2 = print_num(result);

    print_num(result_times_2);

    return result;
}


